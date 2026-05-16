alter table public.messages
  add column if not exists inquiry_id uuid references public.inquiries(id) on delete set null,
  add column if not exists inquiry_urgency text,
  add column if not exists video_object_key text,
  add column if not exists video_status text,
  add column if not exists video_expires_at timestamp with time zone;

create index if not exists messages_inquiry_id_idx on public.messages(inquiry_id);
create index if not exists messages_video_object_key_idx
  on public.messages(video_object_key)
  where video_object_key is not null;
