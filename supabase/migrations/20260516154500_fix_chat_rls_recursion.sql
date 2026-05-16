drop policy if exists "Users can read chats they participate in" on public.chats;
drop policy if exists "Users can create chats" on public.chats;
drop policy if exists "Users can see participants of their own chats" on public.chat_participants;
drop policy if exists "Users can add themselves as participant" on public.chat_participants;
drop policy if exists "Users can read messages in their chats" on public.messages;
drop policy if exists "Users can send messages in their chats" on public.messages;

drop function if exists public.current_user_is_chat_participant(uuid);

create function public.current_user_is_chat_participant(input_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_participants cp
    where cp.chat_id = input_chat_id
      and cp.user_id = public.current_profile_id()
  )
$$;

revoke all on function public.current_user_is_chat_participant(uuid) from public;
grant execute on function public.current_user_is_chat_participant(uuid) to authenticated;

create policy "Users can read chats they participate in"
on public.chats for select
to authenticated
using (public.current_user_is_chat_participant(id));

create policy "Users can create chats"
on public.chats for insert
to authenticated
with check (public.current_profile_id() is not null);

create policy "Users can update chats they participate in"
on public.chats for update
to authenticated
using (public.current_user_is_chat_participant(id))
with check (public.current_user_is_chat_participant(id));

create policy "Users can see participants of their own chats"
on public.chat_participants for select
to authenticated
using (public.current_user_is_chat_participant(chat_id));

create policy "Users can add chat participants"
on public.chat_participants for insert
to authenticated
with check (
  user_id = public.current_profile_id()
  or exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and (
        (public.current_profile_role() = 'trainer' and p.assigned_trainer_id = public.current_profile_id())
        or (public.current_profile_role() = 'trainee' and p.id = public.current_profile_assigned_trainer_id())
      )
  )
);

create policy "Users can read messages in their chats"
on public.messages for select
to authenticated
using (public.current_user_is_chat_participant(chat_id));

create policy "Users can send messages in their chats"
on public.messages for insert
to authenticated
with check (
  sender_id = public.current_profile_id()
  and public.current_user_is_chat_participant(chat_id)
);
