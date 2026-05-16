drop policy if exists "Anyone can check registration" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Trainers can update assigned trainees" on public.profiles;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "Trainers can read assigned trainees"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'trainer'
      and p.id = public.profiles.assigned_trainer_id
  )
);

create policy "Trainees can read their assigned trainer"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.assigned_trainer_id = public.profiles.id
  )
);

create policy "Trainers can create assigned trainees"
on public.profiles for insert
to authenticated
with check (
  role = 'trainee'
  and assigned_trainer_id is not null
  and exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'trainer'
      and p.id = public.profiles.assigned_trainer_id
  )
);

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
)
with check (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'trainer'
      and p.id = public.profiles.assigned_trainer_id
  )
);

create or replace function public.is_preloaded_phone_allowed(input_phone text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where phone_number = input_phone
      and is_active = true
  );
$$;

create or replace function public.link_my_preloaded_profile()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_phone text;
  linked_profile_id uuid;
begin
  if current_user_id is null then
    return null;
  end if;

  select au.phone
    into current_phone
  from auth.users au
  where au.id = current_user_id;

  if current_phone is null then
    return null;
  end if;

  update public.profiles
     set auth_user_id = current_user_id
   where id = (
     select p.id
     from public.profiles p
     where p.phone_number = current_phone
       and p.auth_user_id is null
       and p.is_active = true
     limit 1
   )
   returning id into linked_profile_id;

  if linked_profile_id is null then
    select p.id
      into linked_profile_id
    from public.profiles p
    where p.auth_user_id = current_user_id
    limit 1;
  end if;

  return linked_profile_id;
end;
$$;

create or replace function public.hook_allow_preloaded_phone_users(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_phone text := event->'user'->>'phone';
  phone_allowed boolean;
begin
  if signup_phone is null or signup_phone = '' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Only preloaded phone sign-ins are allowed.'
      )
    );
  end if;

  select exists (
    select 1
    from public.profiles
    where phone_number = signup_phone
      and is_active = true
  )
  into phone_allowed;

  if not phone_allowed then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'This phone number is not registered.'
      )
    );
  end if;

  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_allow_preloaded_phone_users(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_allow_preloaded_phone_users(jsonb) from authenticated, anon, public;

grant execute on function public.is_preloaded_phone_allowed(text) to anon, authenticated;
grant execute on function public.link_my_preloaded_profile() to authenticated;
