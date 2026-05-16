import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';
import { buildPhoneLoginEmail, normalizePhoneNumber } from '@/lib/auth/phone-email';

export async function POST(request: Request) {
  const { profile } = await getCurrentServerProfile();

  if (!profile || !profile.is_active || profile.role !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const rawPhone = typeof body?.phoneNumber === 'string' ? body.phoneNumber : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const focusArea = typeof body?.focusArea === 'string' ? body.focusArea.trim() : '';
  const farmSize = typeof body?.farmSize === 'string' ? body.farmSize.trim() : '';
  const flockCount =
    body?.flockCount === '' || body?.flockCount == null ? null : Number(body.flockCount);

  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters long.' },
      { status: 400 }
    );
  }

  const phoneNumber = normalizePhoneNumber(rawPhone);
  const email = buildPhoneLoginEmail(phoneNumber);
  const admin = createAdminClient();

  const { data: existingProfile, error: existingProfileError } = await admin
    .from('profiles')
    .select('id, auth_user_id, assigned_trainer_id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message }, { status: 400 });
  }

  if (existingProfile?.auth_user_id) {
    if (existingProfile.assigned_trainer_id !== profile.id) {
      return NextResponse.json(
        { error: 'This phone number already belongs to another active account.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'This trainee already has a login account.' },
      { status: 409 }
    );
  }

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    phone: phoneNumber,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      display_name: displayName,
      login_phone: phoneNumber,
    },
  });

  if (createUserError) {
    return NextResponse.json({ error: createUserError.message }, { status: 400 });
  }

  const authUserId = createdUser.user.id;

  if (existingProfile) {
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        auth_user_id: authUserId,
        email,
        display_name: displayName,
        assigned_trainer_id: profile.id,
        focus_area: focusArea || null,
        farm_size: farmSize || null,
        flock_count: Number.isFinite(flockCount) ? flockCount : null,
        is_active: true,
      })
      .eq('id', existingProfile.id);

    if (updateError) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => null);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  } else {
    const { error: insertError } = await admin.from('profiles').insert({
      auth_user_id: authUserId,
      email,
      display_name: displayName,
      role: 'trainee',
      phone_number: phoneNumber,
      assigned_trainer_id: profile.id,
      focus_area: focusArea || null,
      farm_size: farmSize || null,
      flock_count: Number.isFinite(flockCount) ? flockCount : null,
      is_active: true,
    });

    if (insertError) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => null);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
