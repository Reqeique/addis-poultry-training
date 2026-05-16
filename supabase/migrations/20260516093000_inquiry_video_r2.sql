alter table public.inquiries
  add column if not exists video_storage_provider text,
  add column if not exists video_asset_type text,
  add column if not exists video_status text,
  add column if not exists video_url text,
  add column if not exists video_object_key text,
  add column if not exists video_mime_type text,
  add column if not exists video_size_bytes bigint,
  add column if not exists video_duration_seconds integer,
  add column if not exists video_width integer,
  add column if not exists video_height integer,
  add column if not exists video_expires_at timestamptz,
  add column if not exists response_audio_url text;

create index if not exists idx_inquiries_video_expires_at
  on public.inquiries(video_expires_at);
