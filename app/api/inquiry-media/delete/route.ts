import { NextResponse } from 'next/server';
import { deleteR2Object } from '@/lib/r2';
import { getCurrentServerProfile } from '@/lib/server-profile';

export async function POST(request: Request) {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const objectKey = typeof body?.objectKey === 'string' ? body.objectKey : '';

  if (!objectKey.startsWith(`inquiries/${profile.id}/`)) {
    return NextResponse.json({ error: 'Invalid object key.' }, { status: 400 });
  }

  await deleteR2Object(objectKey);
  return NextResponse.json({ ok: true });
}
