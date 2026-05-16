import { NextResponse } from 'next/server';
import { createSignedDownloadUrl } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { getCurrentServerProfile } from '@/lib/server-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('id, trainee_id, trainer_id, video_object_key, video_expires_at')
    .eq('id', id)
    .maybeSingle();

  if (!inquiry?.video_object_key) {
    return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  }

  const allowed =
    inquiry.trainee_id === profile.id ||
    (profile.role === 'trainer' && inquiry.trainer_id === profile.id);

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (inquiry.video_expires_at && new Date(inquiry.video_expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Video has expired.' }, { status: 410 });
  }

  const signedUrl = await createSignedDownloadUrl({
    objectKey: inquiry.video_object_key,
  });

  return NextResponse.redirect(signedUrl);
}
