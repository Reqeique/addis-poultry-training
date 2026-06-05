-- Enable pg_cron if not enabled
create extension if not exists pg_cron;

-- Add subscription tracking columns to profiles
alter table public.profiles
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists last_payment_at timestamptz;

-- Index for efficient expiry queries
create index if not exists idx_profiles_subscription_expires_at
  on public.profiles(subscription_expires_at)
  where role = 'trainee';

-- Function: activate a trainee's subscription for 30 days
-- Called by the trainer when they record a payment / toggle active
create or replace function public.activate_trainee_subscription(trainee_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_trainer_id uuid;
begin
  -- Resolve the calling trainer's profile id
  select id into calling_trainer_id
  from public.profiles
  where auth_user_id = auth.uid()
    and role = 'trainer'
  limit 1;

  if calling_trainer_id is null then
    raise exception 'Only trainers can activate subscriptions.';
  end if;

  -- Ensure the trainee is actually assigned to this trainer
  if not exists (
    select 1 from public.profiles
    where id = trainee_profile_id
      and assigned_trainer_id = calling_trainer_id
      and role = 'trainee'
  ) then
    raise exception 'Trainee is not assigned to you.';
  end if;

  update public.profiles
  set
    is_active              = true,
    last_payment_at        = now(),
    subscription_expires_at = now() + interval '30 days',
    updated_at             = now()
  where id = trainee_profile_id;
end;
$$;

grant execute on function public.activate_trainee_subscription(uuid) to authenticated;

-- Function: expire subscriptions whose deadline has passed (runs via pg_cron)
create or replace function public.expire_overdue_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    is_active  = false,
    updated_at = now()
  where role = 'trainee'
    and is_active = true
    and subscription_expires_at is not null
    and subscription_expires_at < now();
end;
$$;

-- Schedule the expiry check to run every hour via pg_cron
-- (pg_cron is available by default on Supabase hosted projects)
select cron.schedule(
  'expire-trainee-subscriptions',   -- job name (idempotent)
  '0 * * * *',                       -- every hour at :00
  $$ select public.expire_overdue_subscriptions(); $$
);
