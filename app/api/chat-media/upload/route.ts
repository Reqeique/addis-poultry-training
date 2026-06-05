import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { uploadR2Object } from '@/lib/r2';
import { getCurrentServerProfile } from '@/lib/server-profile';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  return map[contentType] ?? 'bin';
}

export async function POST(request: Request) {
  const { profile } = await getCurrentServerProfile();

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);

  if (!isImage && !isAudio) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json({ error: 'File size out of range.' }, { status: 400 });
  }

  const mediaType = isImage ? 'images' : 'audio';
  const ext = getExtension(file.type);
  const objectKey = `chat/${mediaType}/${profile.id}/${Date.now()}-${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await uploadR2Object({ objectKey, contentType: file.type, body: bytes });

  return NextResponse.json({ objectKey, mediaType });
}
