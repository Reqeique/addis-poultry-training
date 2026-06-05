import { NextResponse } from 'next/server';
import { createSignedDownloadUrl } from '@/lib/r2';
import { getCurrentServerProfile } from '@/lib/server-profile';

// Serves chat images and audio from R2 via a short-lived signed URL redirect.
// objectKey path segments are joined back since Next.js splits on '/'.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ objectKey: string[] }> }
) {
  const { profile } = await getCurrentServerProfile();

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { objectKey: segments } = await params;
  // segments = ['chat', 'images', '<profileId>', '<filename>']
  const objectKey = `chat/${segments.join('/')}`;

  try {
    const signedUrl = await createSignedDownloadUrl({ objectKey, expiresIn: 300 });
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  }
}
