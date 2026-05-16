import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteR2Object } from '@/lib/r2';
import { getCurrentServerProfile } from '@/lib/server-profile';

type UploadedVideoPayload = {
  objectKey?: string;
  canonicalUrl?: string;
  expiresAt?: string;
  contentType?: string;
  fileSize?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
};

export async function GET() {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('inquiries')
    .select('*')
    .eq('trainee_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ inquiries: data ?? [] });
}

export async function POST(request: Request) {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const urgency = body?.urgency === 'High' ? 'High' : 'Normal';
  const image = typeof body?.image === 'string' ? body.image : null;
  const audioUrl = typeof body?.audioUrl === 'string' ? body.audioUrl : null;
  const uploadedVideo = (body?.uploadedVideo ?? null) as UploadedVideoPayload | null;

  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('inquiries').insert({
    trainee_id: profile.id,
    trainer_id: profile.assigned_trainer_id,
    trainee_name: profile.display_name,
    message,
    urgency,
    status: 'pending',
    image,
    audio_url: audioUrl,
    video_storage_provider: uploadedVideo?.objectKey ? 'r2' : null,
    video_asset_type: uploadedVideo?.objectKey ? 'file' : null,
    video_status: uploadedVideo?.objectKey ? 'ready' : null,
    video_url: uploadedVideo?.canonicalUrl ?? null,
    video_object_key: uploadedVideo?.objectKey ?? null,
    video_mime_type: uploadedVideo?.contentType ?? null,
    video_size_bytes: uploadedVideo?.fileSize ?? null,
    video_duration_seconds: uploadedVideo?.durationSeconds ?? null,
    video_width: uploadedVideo?.width ?? null,
    video_height: uploadedVideo?.height ?? null,
    video_expires_at: uploadedVideo?.expiresAt ?? null,
  });

  if (error) {
    if (uploadedVideo?.objectKey) {
      await deleteR2Object(uploadedVideo.objectKey).catch(() => null);
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
