drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Trainers can read assigned trainees" on public.profiles;
drop policy if exists "Trainees can read their assigned trainer" on public.profiles;
drop policy if exists "Trainers can create assigned trainees" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Trainers can update assigned trainees" on public.profiles;
drop policy if exists "Trainees see own inquiries" on public.inquiries;
drop policy if exists "Trainers see all inquiries" on public.inquiries;
drop policy if exists "Trainers see assigned inquiries" on public.inquiries;
drop policy if exists "Trainees can create inquiries" on public.inquiries;
drop policy if exists "Trainers can respond to inquiries" on public.inquiries;
drop policy if exists "Trainers can respond to assigned inquiries" on public.inquiries;

drop function if exists public.current_profile_id();
drop function if exists public.current_profile_role();
drop function if exists public.current_profile_assigned_trainer_id();

create function public.current_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create function public.current_profile_assigned_trainer_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select assigned_trainer_id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

revoke all on function public.current_profile_id() from public;
revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_assigned_trainer_id() from public;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_assigned_trainer_id() to authenticated;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "Trainers can read assigned trainees"
on public.profiles for select
to authenticated
using (
  public.current_profile_role() = 'trainer'
  and assigned_trainer_id = public.current_profile_id()
);

create policy "Trainees can read their assigned trainer"
on public.profiles for select
to authenticated
using (
  public.current_profile_role() = 'trainee'
  and id = public.current_profile_assigned_trainer_id()
);

create policy "Trainers can create assigned trainees"
on public.profiles for insert
to authenticated
with check (
  role = 'trainee'
  and assigned_trainer_id is not null
  and public.current_profile_role() = 'trainer'
  and assigned_trainer_id = public.current_profile_id()
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
  public.current_profile_role() = 'trainer'
  and assigned_trainer_id = public.current_profile_id()
)
with check (
  public.current_profile_role() = 'trainer'
  and assigned_trainer_id = public.current_profile_id()
);

create policy "Trainees see own inquiries"
on public.inquiries for select
to authenticated
using (
  public.current_profile_role() = 'trainee'
  and trainee_id = public.current_profile_id()
);

create policy "Trainers see assigned inquiries"
on public.inquiries for select
to authenticated
using (
  public.current_profile_role() = 'trainer'
  and trainer_id = public.current_profile_id()
);

create policy "Trainees can create inquiries"
on public.inquiries for insert
to authenticated
with check (
  public.current_profile_role() = 'trainee'
  and trainee_id = public.current_profile_id()
  and trainer_id = public.current_profile_assigned_trainer_id()
);

create policy "Trainers can respond to assigned inquiries"
on public.inquiries for update
to authenticated
using (
  public.current_profile_role() = 'trainer'
  and trainer_id = public.current_profile_id()
)
with check (
  public.current_profile_role() = 'trainer'
  and trainer_id = public.current_profile_id()
);
