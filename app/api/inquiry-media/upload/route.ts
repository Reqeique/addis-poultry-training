import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { buildCanonicalVideoUrl, uploadR2Object } from '@/lib/r2';
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

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const durationSeconds = Number(formData?.get('durationSeconds') ?? 0);
  const width = Number(formData?.get('width') ?? 0);
  const height = Number(formData?.get('height') ?? 0);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing video file.' }, { status: 400 });
  }

  if (!file.type.startsWith('video/')) {
    return NextResponse.json({ error: 'Invalid media type.' }, { status: 400 });
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Video is too large.' }, { status: 400 });
  }

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    return NextResponse.json({ error: 'Video duration exceeds 3 minutes.' }, { status: 400 });
  }

  const objectKey = `inquiries/${profile.id}/${Date.now()}-${randomUUID()}.${getFileExtension(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await uploadR2Object({
    objectKey,
    contentType: file.type,
    body: bytes,
  });

  const expiresAt = new Date(Date.now() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return NextResponse.json({
    objectKey,
    canonicalUrl: buildCanonicalVideoUrl(objectKey),
    expiresAt,
    contentType: file.type,
    fileSize: file.size,
    durationSeconds,
    width,
    height,
  });
}
