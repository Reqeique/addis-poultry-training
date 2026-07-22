import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';
import { buildPhoneLoginEmail, normalizePhoneNumber } from '@/lib/auth/phone-email';

export async function GET() {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, display_name, phone_number, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const rawPhone = typeof body?.phoneNumber === 'string' ? body.phoneNumber : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = body?.role === 'trainer' || body?.role === 'trainee' ? body.role : '';
  const focusArea = typeof body?.focusArea === 'string' ? body.focusArea.trim() : '';
  const farmSize = typeof body?.farmSize === 'string' ? body.farmSize.trim() : '';
  const flockCountRaw = body?.flockCount;
  const flockCount = flockCountRaw === '' || flockCountRaw == null ? null : Number(flockCountRaw);
  const assignedTrainerId = typeof body?.assignedTrainerId === 'string' ? body.assignedTrainerId : null;

  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
  }

  const phoneNumber = normalizePhoneNumber(rawPhone);
  const email = buildPhoneLoginEmail(phoneNumber);
  const admin = createAdminClient();

  // Duplicate check
  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('id, auth_user_id, phone_number')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (existing?.auth_user_id) {
    return NextResponse.json({ error: 'A user with this phone number already exists.' }, { status: 409 });
  }

  let resolvedAssignedTrainer = assignedTrainerId;
  if (role === 'trainee' && !resolvedAssignedTrainer) {
    const { data: trainer } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'trainer')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    resolvedAssignedTrainer = trainer?.id ?? null;
  }

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    phone: phoneNumber,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { display_name: displayName, login_phone: phoneNumber },
  });

  if (createUserError) {
    return NextResponse.json({ error: createUserError.message }, { status: 400 });
  }

  const authUserId = createdUser.user.id;

  try {
    if (existing) {
      const { error: updateError } = await admin
        .from('profiles')
        .update({
          auth_user_id: authUserId,
          email,
          display_name: displayName,
          role,
          assigned_trainer_id: role === 'trainee' ? resolvedAssignedTrainer : null,
          focus_area: focusArea || null,
          farm_size: farmSize || null,
          flock_count: Number.isFinite(flockCount) ? flockCount : null,
          is_active: true,
        })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await admin.from('profiles').insert({
        auth_user_id: authUserId,
        email,
        display_name: displayName,
        role,
        phone_number: phoneNumber,
        assigned_trainer_id: role === 'trainee' ? resolvedAssignedTrainer : null,
        focus_area: focusArea || null,
        farm_size: farmSize || null,
        flock_count: Number.isFinite(flockCount) ? flockCount : null,
        is_active: true,
      });
      if (insertError) throw insertError;
    }
  } catch (e: any) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => null);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
