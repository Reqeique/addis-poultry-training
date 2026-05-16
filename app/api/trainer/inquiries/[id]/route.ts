import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const response = typeof body?.response === 'string' ? body.response.trim() : '';
  const responseAudioUrl =
    typeof body?.responseAudioUrl === 'string' ? body.responseAudioUrl : null;

  if (!response && !responseAudioUrl) {
    return NextResponse.json({ error: 'Response is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: inquiry, error: findError } = await admin
    .from('inquiries')
    .select('id, trainer_id')
    .eq('id', id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 400 });
  }

  if (!inquiry || inquiry.trainer_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin
    .from('inquiries')
    .update({
      status: 'responded',
      response: response || null,
      response_audio_url: responseAudioUrl,
      responded_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
