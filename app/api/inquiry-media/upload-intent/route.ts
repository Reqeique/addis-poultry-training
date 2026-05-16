import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { buildCanonicalVideoUrl, createSignedUploadUrl } from '@/lib/r2';
import { getCurrentServerProfile } from '@/lib/server-profile';

const VIDEO_RETENTION_DAYS = 30;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 180;

function getFileExtension(contentType: string) {
  if (contentType.includes('mp4')) {
    return 'mp4';
  }

  if (contentType.includes('webm')) {
    return 'webm';
  }

  return 'bin';
}

export async function POST(request: Request) {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!profile.assigned_trainer_id) {
    return NextResponse.json(
      { error: 'No trainer is assigned to this account yet.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
  const fileSize = Number(body?.fileSize ?? 0);
  const durationSeconds = Number(body?.durationSeconds ?? 0);

  if (!contentType.startsWith('video/')) {
    return NextResponse.json({ error: 'Invalid media type.' }, { status: 400 });
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Video is too large.' }, { status: 400 });
  }

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    return NextResponse.json({ error: 'Video duration exceeds 3 minutes.' }, { status: 400 });
  }

  const objectKey = `inquiries/${profile.id}/${Date.now()}-${randomUUID()}.${getFileExtension(contentType)}`;
  const uploadUrl = await createSignedUploadUrl({
    objectKey,
    contentType,
  });

  const expiresAt = new Date(Date.now() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return NextResponse.json({
    uploadUrl,
    objectKey,
    canonicalUrl: buildCanonicalVideoUrl(objectKey),
    expiresAt,
  });
}
