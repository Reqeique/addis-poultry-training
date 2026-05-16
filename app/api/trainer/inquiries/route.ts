import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';

export async function GET() {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('inquiries')
    .select('*')
    .eq('trainer_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ inquiries: data ?? [] });
}
