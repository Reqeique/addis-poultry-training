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
    .select('id, display_name, phone_number, role, is_active, focus_area, farm_size, flock_count, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: data });
}

export async function PATCH(request: Request) {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  }
  if (id === adminProfile.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role or deactivate your own account.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, auth_user_id, phone_number, role')
    .eq('id', id)
    .maybeSingle();

  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 400 });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body?.displayName !== undefined) {
    const displayName = String(body.displayName).trim();
    if (!displayName) return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
    patch.display_name = displayName;
  }
  if (body?.role !== undefined) {
    if (body.role !== 'trainer' && body.role !== 'trainee' && body.role !== 'admin') {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    patch.role = body.role;
    // A demoted/changed user must not keep a stale trainer assignment.
    if (body.role !== 'trainee') patch.assigned_trainer_id = null;
  }
  for (const [key, column] of [
    ['focusArea', 'focus_area'],
    ['farmSize', 'farm_size'],
  ] as const) {
    if (body?.[key] !== undefined) {
      patch[column] = String(body[key]).trim() || null;
    }
  }
  if (body?.flockCount !== undefined) {
    patch.flock_count = body.flockCount === '' || body.flockCount == null ? null : Number(body.flockCount);
  }
  if (body?.isActive !== undefined) {
    patch.is_active = Boolean(body.isActive);
  }

  let phoneNumber: string | null = null;
  if (body?.phoneNumber !== undefined) {
    phoneNumber = normalizePhoneNumber(String(body.phoneNumber));
    patch.phone_number = phoneNumber;
    patch.email = buildPhoneLoginEmail(phoneNumber);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  // Keep the Auth login in sync when the phone number changes (login email is phone-derived).
  if (phoneNumber && target.auth_user_id) {
    const { error: authError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
      email: buildPhoneLoginEmail(phoneNumber),
      phone: phoneNumber,
      user_metadata: { display_name: patch.display_name ?? undefined, login_phone: phoneNumber },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('id, display_name, phone_number, role, is_active, focus_area, farm_size, flock_count, created_at')
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ user: updated });
}

export async function DELETE(request: Request) {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  }
  if (id === adminProfile.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, auth_user_id')
    .eq('id', id)
    .maybeSingle();

  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 400 });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // messages.sender_id and inquiries reference profiles without ON DELETE CASCADE —
  // hard delete would orphan or violate FKs, so refuse and point at deactivation.
  const [{ count: msgCount }, { count: inqCount }] = await Promise.all([
    admin.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', id),
    admin.from('inquiries').select('id', { count: 'exact', head: true }).or(`trainee_id.eq.${id},trainer_id.eq.${id}`),
  ]);
  if ((msgCount ?? 0) > 0 || (inqCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'This user has chat or inquiry history. Deactivate instead of deleting to preserve records.' },
      { status: 409 }
    );
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  if (target.auth_user_id) {
    await admin.auth.admin.deleteUser(target.auth_user_id).catch(() => null);
  }
  return NextResponse.json({ ok: true });
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
