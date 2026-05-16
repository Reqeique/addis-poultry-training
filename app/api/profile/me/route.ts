import { NextResponse } from 'next/server';
import { getCurrentServerProfile } from '@/lib/server-profile';

export async function GET() {
  const { user, profile } = await getCurrentServerProfile();

  if (!user || !profile) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  return NextResponse.json({ profile });
}
