-- Drop the restricted policy
drop policy if exists "Authenticated users can read profiles" on public.profiles;

-- Create a more permissive policy for login verification
create policy "Anyone can check registration"
on public.profiles for select
to anon, authenticated
using (true);
