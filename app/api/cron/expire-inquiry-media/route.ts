import { NextResponse } from 'next/server';
import { deleteR2Object } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token || token !== process.env.MEDIA_CLEANUP_CRON_SECRET) {
    return unauthorized();
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: expiredInquiries, error } = await supabase
    .from('inquiries')
    .select('id, video_object_key')
    .not('video_object_key', 'is', null)
    .lte('video_expires_at', now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const inquiry of expiredInquiries ?? []) {
    if (inquiry.video_object_key) {
      try {
        await deleteR2Object(inquiry.video_object_key);
      } catch {
        // Ignore object delete failures so DB metadata can still be cleaned up.
      }
    }

    await supabase
      .from('inquiries')
      .update({
        video_url: null,
        video_object_key: null,
        video_mime_type: null,
        video_size_bytes: null,
        video_duration_seconds: null,
        video_width: null,
        video_height: null,
        video_storage_provider: null,
        video_asset_type: null,
        video_status: 'expired',
        video_expires_at: null,
      })
      .eq('id', inquiry.id);
  }

  return NextResponse.json({
    expiredCount: expiredInquiries?.length ?? 0,
  });
}
