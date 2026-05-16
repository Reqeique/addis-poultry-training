drop policy if exists "Users can read newly created chats" on public.chats;

create policy "Users can read newly created chats"
on public.chats for select
to authenticated
using (
  last_message is null
  and last_message_time is null
  and created_at > now() - interval '2 minutes'
);
