"""
═══════════════════════════════════════════════════════════
VISHWAKESH PORTFOLIO — PYTHON DISCORD BOT
Tracks presence, handles booking notifications
Run: python bot.py
Deploy: Railway, Render, or any VPS
═══════════════════════════════════════════════════════════

Requirements:
  pip install discord.py python-dotenv supabase aiohttp
"""
import os, asyncio, aiohttp
from datetime import datetime, timezone
from dotenv import load_dotenv
import discord
from discord.ext import commands, tasks
from supabase import create_client

load_dotenv()

TOKEN       = os.getenv('DISCORD_BOT_TOKEN')
OWNER_ID    = int(os.getenv('DISCORD_USER_ID', '0'))
SB_URL      = os.getenv('SUPABASE_URL')
SB_KEY      = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')

sb = create_client(SB_URL, SB_KEY)

# ─── BOT SETUP ────────────────────────────────────────────
intents = discord.Intents.default()
intents.presences   = True
intents.members     = True
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

# ─── EVENTS ───────────────────────────────────────────────

@bot.event
async def on_ready():
    print(f'🌸 Bot online: {bot.user} (ID: {bot.user.id})')
    print(f'   Tracking presence for user ID: {OWNER_ID}')
    check_bookings.start()
    sync_presence.start()

@bot.event
async def on_presence_update(before, after):
    """Track Vishwakesh's presence changes in real-time."""
    if after.id != OWNER_ID:
        return

    status   = str(after.status)
    activity = None
    details  = None

    if after.activities:
        for a in after.activities:
            if not isinstance(a, discord.CustomActivity):
                activity = a.name
                details  = getattr(a, 'details', None)
                break
        if activity is None:
            ca = next((a for a in after.activities if isinstance(a, discord.CustomActivity)), None)
            if ca:
                activity = ca.name
                details  = str(ca.emoji) if ca.emoji else None

    # Save to Supabase
    sb.table('discord_presence').upsert({
        'user_id':          str(OWNER_ID),
        'status':           status,
        'activity':         activity,
        'activity_details': details,
        'last_seen':        datetime.now(timezone.utc).isoformat(),
        'updated_at':       datetime.now(timezone.utc).isoformat(),
    }).execute()

    print(f'[{datetime.now().strftime("%H:%M")}] Presence: {before.status} → {status} | {activity or "—"}')

    # If coming online, alert about pending bookings
    if str(before.status) in ('offline', 'invisible') and str(after.status) in ('online', 'idle'):
        await notify_pending_bookings()

@bot.event
async def on_message(message):
    """Handle DM commands to bot."""
    if message.author.id != OWNER_ID:
        return
    if not isinstance(message.channel, discord.DMChannel):
        return
    await bot.process_commands(message)

# ─── COMMANDS ─────────────────────────────────────────────

@bot.command(name='bookings')
async def list_bookings(ctx):
    """Show pending bookings (DM only)."""
    if ctx.author.id != OWNER_ID:
        return
    res = sb.table('bookings').select('*').eq('status', 'pending').order('created_at').execute()
    data = res.data or []
    if not data:
        await ctx.send('✅ No pending bookings!')
        return

    msg = f'📬 **Pending Bookings ({len(data)})**\n\n'
    for i, b in enumerate(data[:10], 1):
        msg += (
            f'`{i}.` **{b["name"]}** · {b["discord_handle"]}\n'
            f'   Topic: {b["topic"]}\n'
            f'   Time: {b.get("preferred_date","?") or "Flexible"} {b.get("preferred_time","") or ""}\n'
            f'   ID: `{b["id"][:8]}...`\n\n'
        )
    await ctx.send(msg)

@bot.command(name='accept')
async def accept_booking(ctx, booking_id: str):
    """Accept a booking: !accept <id_prefix>"""
    if ctx.author.id != OWNER_ID:
        return
    res = sb.table('bookings').select('*').ilike('id', f'{booking_id}%').execute()
    if not res.data:
        await ctx.send(f'❌ No booking found starting with `{booking_id}`')
        return
    b = res.data[0]
    sb.table('bookings').update({'status': 'accepted', 'updated_at': datetime.now(timezone.utc).isoformat()}).eq('id', b['id']).execute()
    await ctx.send(f'✅ Booking accepted! **{b["name"]}** ({b["discord_handle"]}) — {b["topic"]}')

@bot.command(name='decline')
async def decline_booking(ctx, booking_id: str):
    """Decline a booking: !decline <id_prefix>"""
    if ctx.author.id != OWNER_ID:
        return
    res = sb.table('bookings').select('*').ilike('id', f'{booking_id}%').execute()
    if not res.data:
        await ctx.send(f'❌ No booking found starting with `{booking_id}`')
        return
    b = res.data[0]
    sb.table('bookings').update({'status': 'declined', 'updated_at': datetime.now(timezone.utc).isoformat()}).eq('id', b['id']).execute()
    await ctx.send(f'🚫 Booking declined: {b["name"]} — {b["topic"]}')

@bot.command(name='status')
async def bot_status(ctx):
    """Show bot status."""
    if ctx.author.id != OWNER_ID:
        return
    pending = sb.table('bookings').select('id', count='exact', head=True).eq('status', 'pending').execute()
    total   = sb.table('visitors').select('id', count='exact', head=True).execute()
    chats   = sb.table('chat_logs').select('id', count='exact', head=True).execute()
    await ctx.send(
        f'🤖 **Portfolio Bot Status**\n'
        f'📬 Pending bookings: {pending.count or 0}\n'
        f'👥 Total visitors: {total.count or 0}\n'
        f'💬 AI chats: {chats.count or 0}\n'
        f'🟢 Bot: Online'
    )

# ─── BACKGROUND TASKS ────────────────────────────────────

@tasks.loop(minutes=5)
async def check_bookings():
    """Every 5 min: notify about new bookings."""
    try:
        res = sb.table('bookings').select('*').eq('status', 'pending').eq('discord_notified', False).execute()
        for b in (res.data or []):
            owner = bot.get_user(OWNER_ID)
            if not owner:
                try: owner = await bot.fetch_user(OWNER_ID)
                except: continue
            await owner.send(
                f'📬 **New Booking!**\n'
                f'**From:** {b["name"]} ({b["discord_handle"]})\n'
                f'**Topic:** {b["topic"]}\n'
                f'**Time:** {b.get("preferred_date") or "Flexible"} {b.get("preferred_time") or ""} {b.get("timezone","IST")}\n'
                f'**Message:** {b.get("message") or "—"}\n\n'
                f'Reply: `!accept {b["id"][:8]}` or `!decline {b["id"][:8]}`'
            )
            sb.table('bookings').update({'discord_notified': True}).eq('id', b['id']).execute()
    except Exception as e:
        print(f'check_bookings error: {e}')

@tasks.loop(minutes=2)
async def sync_presence():
    """Sync presence to Supabase every 2 min as backup."""
    try:
        member = None
        for guild in bot.guilds:
            m = guild.get_member(OWNER_ID)
            if m:
                member = m
                break
        if member:
            status   = str(member.status)
            activity = None
            if member.activities:
                for a in member.activities:
                    if not isinstance(a, discord.CustomActivity):
                        activity = a.name; break
            sb.table('discord_presence').upsert({
                'user_id': str(OWNER_ID),
                'status': status,
                'activity': activity,
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
    except Exception as e:
        print(f'sync_presence error: {e}')

# ─── HELPERS ──────────────────────────────────────────────

async def notify_pending_bookings():
    """Called when Vishwakesh comes online."""
    try:
        res = sb.table('bookings').select('*').eq('status', 'pending').execute()
        count = len(res.data or [])
        if count == 0:
            return
        owner = bot.get_user(OWNER_ID)
        if not owner:
            owner = await bot.fetch_user(OWNER_ID)
        await owner.send(
            f'🟢 **Welcome back!** You have **{count}** pending booking(s).\n'
            f'Send `!bookings` to see them.'
        )
    except Exception as e:
        print(f'notify error: {e}')

# ─── RUN ──────────────────────────────────────────────────
if __name__ == '__main__':
    if not TOKEN:
        print('❌ DISCORD_BOT_TOKEN not set in .env')
    else:
        print('🌸 Starting Vishwakesh Portfolio Bot...')
        bot.run(TOKEN)
