# 🌸 Vishwakesh Portfolio — Deployment Guide

## Architecture Overview
```
index.html        ← Full frontend (standalone works without backend)
server.js         ← Node.js backend (Discord OAuth + booking notifications)
bot.py            ← Python Discord bot (presence tracking + DMs)
setup.sql         ← Supabase database schema
```

---

## STEP 1 — Supabase Setup
1. Go to supabase.com → Your project → SQL Editor
2. Paste contents of `setup.sql` → Click **Run**
3. All tables are created with default data ✓

---

## STEP 2 — Get Your Discord User ID
1. Open Discord → User Settings → Advanced → **Enable Developer Mode**
2. Right-click your own name anywhere → **Copy User ID**
3. That 18-digit number is your Discord User ID

## STEP 3 — Enable Lanyard (real-time presence)
1. Join: **discord.gg/lanyard** with YOUR Discord account
2. That's it — your presence will be tracked automatically
3. In Admin Panel → Hero → paste your Discord User ID

---

## STEP 4 — Deploy Frontend (Netlify — FREE)
1. Go to **netlify.com** → Sign up free
2. "Add new site" → "Deploy manually"
3. Drag `index.html` into the deploy box
4. Done! Your site is live 🎉

**Admin access:** Click ⚙ ADMIN in footer
- Username: `vishwakesh`
- Password: `lulu@990`

---

## STEP 5 — Deploy Backend (Optional, for Discord OAuth + DM notifications)

### Create Discord App
1. Go to **discord.com/developers/applications**
2. "New Application" → name it "Vishwakesh Portfolio"
3. Go to **Bot** section → "Add Bot" → copy **Bot Token**
4. Go to **OAuth2** → add redirect: `https://your-backend-url.com/auth/discord/callback`
5. Enable scopes: `identify`

### Deploy to Railway (FREE)
1. Go to **railway.app** → New Project → Deploy from GitHub
   OR drag & drop
2. Copy `.env.example` to `.env`, fill in your values
3. Run: `npm install` then `npm start`

### Install & run Python bot
```bash
pip install -r requirements.txt
python bot.py
```

Bot commands (send via Discord DM to bot):
- `!bookings` — see pending bookings
- `!accept <id>` — accept a booking
- `!decline <id>` — decline a booking
- `!status` — bot stats

---

## WHAT WORKS WITHOUT BACKEND
✅ All portfolio sections (loads from Supabase)
✅ Discord presence (via Lanyard WebSocket — real-time!)
✅ Booking form (saves directly to Supabase)
✅ AI chat (OpenRouter)
✅ Admin panel
✅ Falling cherry blossoms
✅ Custom cursor, animations, all visual effects

## WHAT NEEDS BACKEND
⚡ Discord OAuth login (optional — pre-fills booking form)
⚡ Discord DM notifications when someone books

---

## File Structure
```
portfolio/
├── index.html          ← Deploy this to Netlify
├── server.js           ← Deploy this to Railway/Render
├── bot.py              ← Run this as a service
├── package.json        ← Node.js dependencies
├── requirements.txt    ← Python dependencies
├── .env.example        ← Copy to .env and fill
└── setup.sql           ← Run in Supabase SQL editor
```

---

## Credentials
- Supabase URL: `https://jysabpfnrkcxlptfomip.supabase.co`
- Admin login: `vishwakesh` / `lulu@990`
- OpenRouter key: already embedded in index.html

## Theme
AoT + Flowers — Sad · Happy · Peace
Fonts: Cinzel (headings) + Cormorant Garamond (body) + IBM Plex Mono (labels)
