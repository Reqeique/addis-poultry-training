-- Phase 2 — Database Schema (Supabase Postgres)

-- profiles — app-managed user records
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text,
  display_name text not null,
  photo_url text,
  role text not null default 'trainee' check (role in ('trainer', 'trainee')),
  focus_area text,
  assigned_trainer_id uuid references public.profiles(id),
  phone_number text not null unique,
  location text,
  farm_size text,
  flock_count integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- chats — 1-on-1 chat sessions
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  last_message text,
  last_message_time timestamptz,
  created_at timestamptz not null default now()
);

-- chat_participants — join table for chat members
create table public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique(chat_id, user_id)
);

-- messages — chat messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  text text,
  image_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

-- inquiries — trainee-to-trainer questions
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.profiles(id),
  trainer_id uuid references public.profiles(id),
  trainee_name text not null,
  message text not null,
  urgency text not null default 'Normal' check (urgency in ('Normal', 'High')),
  status text not null default 'pending' check (status in ('pending', 'responded')),
  image text,
  audio_url text,
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_profiles_role on public.profiles(role);
create index idx_chat_participants_user on public.chat_participants(user_id);
create index idx_chat_participants_chat on public.chat_participants(chat_id);
create index idx_messages_chat on public.messages(chat_id);
create index idx_messages_created on public.messages(created_at);
create index idx_inquiries_trainee on public.inquiries(trainee_id);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;
alter table public.inquiries enable row level security;

-- profiles policies
create policy "Anyone can check registration"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Trainers can update assigned trainees"
on public.profiles for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
    and p.role = 'trainer'
    and p.id = public.profiles.assigned_trainer_id
  )
);

-- chats policies
create policy "Users can read chats they participate in"
on public.chats for select
to authenticated
using (
  exists (
    select 1 from public.chat_participants cp
    join public.profiles p on cp.user_id = p.id
    where cp.chat_id = public.chats.id
    and p.auth_user_id = auth.uid()
  )
);

create policy "Users can create chats"
on public.chats for insert
to authenticated
with check (true);

-- chat_participants policies
create policy "Users can see participants of their own chats"
on public.chat_participants for select
to authenticated
using (
  exists (
    select 1 from public.chat_participants cp
    join public.profiles p on cp.user_id = p.id
    where cp.chat_id = public.chat_participants.chat_id
    and p.auth_user_id = auth.uid()
  )
);

create policy "Users can add themselves as participant"
on public.chat_participants for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = public.chat_participants.user_id
    and p.auth_user_id = auth.uid()
  )
);

-- messages policies
create policy "Users can read messages in their chats"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.chat_participants cp
    join public.profiles p on cp.user_id = p.id
    where cp.chat_id = public.messages.chat_id
    and p.auth_user_id = auth.uid()
  )
);

create policy "Users can send messages in their chats"
on public.messages for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = public.messages.sender_id
    and p.auth_user_id = auth.uid()
  )
);

-- inquiries policies
create policy "Trainees see own inquiries"
on public.inquiries for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = public.inquiries.trainee_id
    and p.auth_user_id = auth.uid()
  )
);

create policy "Trainers see all inquiries"
on public.inquiries for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
    and p.role = 'trainer'
  )
);

create policy "Trainees can create inquiries"
on public.inquiries for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = public.inquiries.trainee_id
    and p.auth_user_id = auth.uid()
  )
);

create policy "Trainers can respond to inquiries"
on public.inquiries for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
    and p.role = 'trainer'
  )
);

-- Enable Realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table inquiries;
alter publication supabase_realtime add table chats;
