-- Allow users to read and link their own profiles client-side
-- This is necessary for environments like Android Capacitor where server-side API routes are unavailable.

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (
  auth.uid() = auth_user_id
  or
  (auth.jwt() ->> 'email') = email
);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (
  auth.uid() = auth_user_id
  or
  (auth_user_id is null and (auth.jwt() ->> 'email') = email)
)
with check (
  auth.uid() = auth_user_id
);
