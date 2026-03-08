// ═══════════════════════════════════════════════════════════
// VISHWAKESH PORTFOLIO — NODE.JS BACKEND
// Discord OAuth + Bookings API + Discord Notifications
// Deploy to: Railway, Render, or any Node.js host
// ═══════════════════════════════════════════════════════════
require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const cors       = require('cors');
const axios      = require('axios');
const cron       = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── SUPABASE ────────────────────────────────────────────────
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'vishwakesh-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

const BASE_URL    = process.env.BASE_URL || `http://localhost:${PORT}`;
const CLIENT_ID   = process.env.DISCORD_CLIENT_ID;
const CLIENT_SEC  = process.env.DISCORD_CLIENT_SECRET;
const BOT_TOKEN   = process.env.DISCORD_BOT_TOKEN;
const OWNER_ID    = process.env.DISCORD_USER_ID;

// ═══════════════════════════════════════════════════════════
// DISCORD OAUTH ROUTES
// ═══════════════════════════════════════════════════════════

// Step 1: Redirect to Discord login
app.get('/auth/discord', (req, res) => {
  const redirect = encodeURIComponent(`${BASE_URL}/auth/discord/callback`);
  const scope    = encodeURIComponent('identify');
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=${scope}`
  );
});

// Step 2: Handle callback
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?auth=failed');
  try {
    // Exchange code for token
    const tokenRes = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SEC,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  `${BASE_URL}/auth/discord/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenRes.data;

    // Fetch Discord user
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const user = userRes.data;

    // Save session
    req.session.user = {
      id:       user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar:   user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`,
      globalName: user.global_name || user.username,
    };

    // Log visitor in Supabase
    await sb.from('visitors').insert({
      discord_id:       user.id,
      discord_username: user.global_name || user.username,
      discord_avatar:   req.session.user.avatar,
    });

    res.redirect('/?auth=success');
  } catch (err) {
    console.error('Discord OAuth error:', err.response?.data || err.message);
    res.redirect('/?auth=failed');
  }
});

// Get current session user
app.get('/api/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════
// DISCORD PRESENCE
// ═══════════════════════════════════════════════════════════

// Proxy Lanyard presence (avoids CORS issues)
app.get('/api/presence', async (req, res) => {
  const userId = OWNER_ID || (await getSettingValue('discord_user_id'));
  if (!userId || userId === 'YOUR_DISCORD_USER_ID') {
    return res.json({ status: 'offline', activity: null, configured: false });
  }
  try {
    const r = await axios.get(`https://api.lanyard.rest/v1/users/${userId}`, { timeout: 4000 });
    const d = r.data.data;
    res.json({
      configured: true,
      status:     d.discord_status || 'offline',
      activity:   d.activities?.[0]?.name || null,
      details:    d.activities?.[0]?.details || null,
      emoji:      d.activities?.[0]?.emoji?.name || null,
    });
  } catch {
    res.json({ status: 'offline', activity: null, configured: true });
  }
});

// ═══════════════════════════════════════════════════════════
// BOOKINGS API
// ═══════════════════════════════════════════════════════════

// Create booking
app.post('/api/bookings', async (req, res) => {
  const { name, discord_handle, topic, message, preferred_date, preferred_time, timezone } = req.body;
  if (!name || !discord_handle || !topic) {
    return res.status(400).json({ error: 'name, discord_handle and topic are required' });
  }

  try {
    const { data, error } = await sb.from('bookings').insert({
      name, discord_handle, topic, message,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      timezone: timezone || 'IST',
      status: 'pending',
    }).select().single();

    if (error) throw error;

    // Send Discord DM to Vishwakesh (if bot configured)
    if (BOT_TOKEN && OWNER_ID) {
      sendDiscordDM(OWNER_ID,
        `📬 **New Booking Request!**\n\n` +
        `**From:** ${name} (${discord_handle})\n` +
        `**Topic:** ${topic}\n` +
        `**When:** ${preferred_date || 'Flexible'} ${preferred_time || ''} ${timezone}\n` +
        `**Message:** ${message || '—'}\n\n` +
        `To respond: Discord → \`${discord_handle}\``
      ).catch(console.error);
    }

    res.json({ ok: true, booking: data });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// List all bookings (admin only)
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const { data } = await sb.from('bookings').select('*').order('created_at', { ascending: false });
  res.json(data || []);
});

// Update booking status (admin)
app.patch('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const { data, error } = await sb.from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error });

  // Notify via DM if accepted
  if (status === 'accepted' && BOT_TOKEN) {
    const booking = data;
    sendDiscordDM(null,
      `✅ Your booking with Vishwakesh has been **accepted**!\n` +
      `Topic: ${booking.topic}\nReach out on Discord to confirm the time.`
    ).catch(() => {});
  }
  res.json({ ok: true, booking: data });
});

// ═══════════════════════════════════════════════════════════
// DISCORD BOT HELPERS
// ═══════════════════════════════════════════════════════════

async function sendDiscordDM(userId, message) {
  if (!BOT_TOKEN) return;
  const target = userId || OWNER_ID;
  // Create DM channel
  const ch = await axios.post(
    'https://discord.com/api/v10/users/@me/channels',
    { recipient_id: target },
    { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
  );
  // Send message
  await axios.post(
    `https://discord.com/api/v10/channels/${ch.data.id}/messages`,
    { content: message },
    { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
  );
}

// ═══════════════════════════════════════════════════════════
// SCHEDULED JOBS
// ═══════════════════════════════════════════════════════════

// Every 5 min: check if Vishwakesh came online and notify pending bookings
cron.schedule('*/5 * * * *', async () => {
  if (!BOT_TOKEN || !OWNER_ID) return;
  try {
    const r = await axios.get(`https://api.lanyard.rest/v1/users/${OWNER_ID}`, { timeout: 4000 });
    const status = r.data?.data?.discord_status;

    if (status === 'online' || status === 'idle') {
      // Find un-notified pending bookings
      const { data } = await sb.from('bookings')
        .select('*').eq('status', 'pending').eq('discord_notified', false);

      for (const b of (data || [])) {
        await sendDiscordDM(OWNER_ID,
          `🟢 **You're online!** Pending booking reminder:\n` +
          `**${b.name}** (${b.discord_handle}) wants to talk about: **${b.topic}**`
        );
        await sb.from('bookings').update({ discord_notified: true }).eq('id', b.id);
      }
    }
  } catch (err) { /* silent */ }
});

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer vishwakesh_admin_2025`) return next();
  // or check session
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

async function getSettingValue(key) {
  const { data } = await sb.from('settings').select('value').eq('key', key).single();
  return data?.value;
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── START ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌸 Vishwakesh Portfolio Backend running on port ${PORT}`);
  console.log(`   Auth:     ${BASE_URL}/auth/discord`);
  console.log(`   Presence: ${BASE_URL}/api/presence`);
  console.log(`   Bookings: ${BASE_URL}/api/bookings\n`);
});
