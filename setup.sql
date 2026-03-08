-- ═══════════════════════════════════════════════════
-- VISHWAKESH PORTFOLIO — FULL SUPABASE SCHEMA v2
-- Run in Supabase → SQL Editor → Run All
-- ═══════════════════════════════════════════════════

drop table if exists bookings cascade;
drop table if exists chat_logs cascade;
drop table if exists visitors cascade;
drop table if exists breathing_forms cascade;
drop table if exists skills cascade;
drop table if exists projects cascade;
drop table if exists anime cascade;
drop table if exists goals cascade;
drop table if exists sections cascade;
drop table if exists settings cascade;
drop table if exists discord_presence cascade;

create table settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null, value text, created_at timestamptz default now()
);
create table sections (
  id uuid default gen_random_uuid() primary key,
  key text unique not null, label text, visible boolean default true
);
create table goals (
  id uuid default gen_random_uuid() primary key,
  key text unique not null, value text
);
create table projects (
  id uuid default gen_random_uuid() primary key,
  title text not null, description text, status text default 'concept',
  icon text default '🔧', tags text, url text,
  sort_order int default 0, visible boolean default true, created_at timestamptz default now()
);
create table anime (
  id uuid default gen_random_uuid() primary key,
  name text not null, accent_color text default '#4a8fff',
  your_quote text, your_lesson text, rating int default 10,
  sort_order int default 0, visible boolean default true
);
create table skills (
  id uuid default gen_random_uuid() primary key,
  name text not null, rank text default 'C', category text, sort_order int default 0
);
create table breathing_forms (
  id uuid default gen_random_uuid() primary key,
  form_number int not null, name text not null, description text,
  training_note text, accent_color text default '#3de0c8', sort_order int default 0
);
create table chat_logs (
  id uuid default gen_random_uuid() primary key,
  question text, answer text, visitor_discord text, created_at timestamptz default now()
);
create table visitors (
  id uuid default gen_random_uuid() primary key,
  discord_id text, discord_username text, discord_avatar text, created_at timestamptz default now()
);
create table bookings (
  id uuid default gen_random_uuid() primary key,
  name text not null, discord_handle text not null, topic text not null,
  message text, preferred_date date, preferred_time text, timezone text default 'IST',
  status text default 'pending', discord_notified boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table discord_presence (
  id uuid default gen_random_uuid() primary key,
  user_id text unique, status text default 'offline',
  activity text, activity_details text,
  last_seen timestamptz default now(), updated_at timestamptz default now()
);

-- Disable RLS for public access
alter table settings disable row level security;
alter table sections disable row level security;
alter table goals disable row level security;
alter table projects disable row level security;
alter table anime disable row level security;
alter table skills disable row level security;
alter table breathing_forms disable row level security;
alter table chat_logs disable row level security;
alter table visitors disable row level security;
alter table bookings disable row level security;
alter table discord_presence disable row level security;

-- ─── DEFAULT DATA ───
insert into settings (key, value) values
  ('hero_name','VISHWAKESH'),
  ('hero_desc','Building bots, automation & digital products — entirely from a phone. Self-taught at 15. Systems thinker. Unstoppable.'),
  ('hero_s1n','10+'),('hero_s1l','PROJECTS'),
  ('hero_s2n','5+'),('hero_s2l','TECH STACKS'),
  ('hero_s3n','2'),('hero_s3l','DIGITAL PRODUCTS'),
  ('hero_s4n','∞'),('hero_s4l','AMBITION'),
  ('contact_discord','lokesh.yadav'),
  ('contact_website','corevibs.xyz'),
  ('discord_user_id','YOUR_DISCORD_USER_ID'),
  ('ai_model','meta-llama/llama-3.3-70b-instruct'),
  ('ai_greeting','Hey! I''m Vishwakesh''s AI. Ask me anything about his skills, projects or booking a call 🌸'),
  ('ai_prompt','You are an AI for Vishwakesh''s portfolio. He is 15, from India, self-taught builder. Skills: Python, Discord/Telegram bots, WordPress, Cloudflare, video editing, crypto, digital products, AI APIs, automation. Projects: corevibs.xyz, Discord AI bot, Telegram VIP bot with payments, ₹49 ebook funnel. Anime: Solo Leveling, Demon Slayer, HxH, Spy x Family, Mushoku Tensei. Created Silence Breathing system (6 forms). Discord: lokesh.yadav. Goal: ₹1L → laptop → freedom. Answer concisely with personality and confidence.');

insert into sections (key, label, visible) values
  ('about','About',true),('powerlevels','Power Levels',true),
  ('discord_booking','Discord & Booking',true),('anime','Anime',true),
  ('breathing','Breathing',true),('projects','Projects',true),
  ('timeline','Timeline',true),('goals','Goals',true),('contact','Contact',true);

insert into goals (key, value) values
  ('current','0'),('target','100000'),
  ('skill','Python Automation'),('streak','0'),
  ('milestone','Buy a laptop at ₹50,000');

insert into skills (name, rank, category, sort_order) values
  ('Python','A','Development',1),('Discord Bots','A','Development',2),
  ('Telegram Bots','A','Development',3),('WordPress','B','Web',4),
  ('Cloudflare DNS','B','Web',5),('Video Editing','A','Creative',6),
  ('Crypto Trading','B','Business',7),('Sales Funnels','B','Business',8),
  ('AI Integration','S','Development',9),('Automation','S','Development',10),
  ('Copywriting','C','Business',11),('System Design','A','Development',12);

insert into anime (name, accent_color, your_quote, your_lesson, rating, sort_order) values
  ('Solo Leveling','#9d7ef0','Arise.','You level up alone. No one gives you the power — you earn it in silence, in the dark, when nobody''s watching.',10,1),
  ('Demon Slayer','#e07fd8','I will never give up.','Tanjiro taught me that breathing — focus — turns an ordinary human into something unstoppable.',10,2),
  ('Hunter x Hunter','#f5c842','Gon, you are light.','Determination > talent. Every single time. Gon had no special power — just will that broke the system.',10,3),
  ('Spy x Family','#4ade80','Operation Strix!','You can build a family — a team — from strangers. Everyone has a hidden mission. Respect that.',9,4),
  ('Mushoku Tensei','#38bdf8','This time, I won''t run.','Second chances are real. Regret is fuel if you use it right. Start over — but smarter.',9,5);

insert into breathing_forms (form_number, name, description, training_note, accent_color, sort_order) values
  (1,'Still Mind','Total mental silence. No thoughts, only breath. Foundation before any action.','10 min daily, morning — before phone.','#38bdf8',1),
  (2,'Iron Patience','Holding discomfort without reaction. Sitting with difficulty until it becomes nothing.','5 min cold exposure or discomfort.','#8b7cf8',2),
  (3,'Focused Strike','All energy at one target. No scatter, no split attention. Pure execution.','Work 45 min zero distractions.','#f59e0b',3),
  (4,'Rising Flame','Building from zero. Igniting after failure. The comeback pattern.','3 deep breaths after every setback.','#ef4444',4),
  (5,'Endless Flow','Sustained output. Not a burst — a river. Daily consistency.','2-hour deep work blocks, same time daily.','#4ade80',5),
  (6,'Void Mastery','Ego dissolved. Action without attachment to outcome. Pure being.','Meditate on outcome independence. Do the work anyway.','#f0a0b8',6);

insert into projects (title, description, status, icon, tags, url, sort_order) values
  ('corevibs.xyz','Live ecommerce store. WordPress + Cloudflare. Custom DNS, cPanel, full stack on mobile.','live','🌐','WordPress,Cloudflare,cPanel','corevibs.xyz',1),
  ('Discord AI Bot','Full Discord bot with AI responses. Commands, context, auto-reply.','built','🤖','Python,Discord.py,AI API','',2),
  ('Telegram VIP Bot','Referral system, ₹150/2d VIP, withdrawal requests, full admin panel.','built','📲','Python,Telegram,Payments','',3),
  ('₹49 Digital Book Funnel','Instagram-to-checkout funnel. Copywriting, landing page, auto delivery.','built','📕','Marketing,Funnels,Digital','',4),
  ('AI Agency Bot','Telegram bot selling AI services. Auto-onboarding, billing. (Concept)','concept','💡','Python,AI,Automation','',5),
  ('Inventory Manager','Mobile app for shop inventory tracking built in Sketchware.','experiment','📦','Sketchware,Android','',6);

select 'Setup complete!' as result;
