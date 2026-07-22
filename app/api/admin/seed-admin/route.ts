import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPhoneLoginEmail, normalizePhoneNumber } from '@/lib/auth/phone-email';

const ADMIN_PHONE = '+251900000001';
const ADMIN_PASSWORD = 'AddisAdmin123!';
const ADMIN_NAME = 'Admin User';

/**
 * Idempotent: creates the admin auth user + profile (role='admin').
 * Safe to call multiple times.
 */
export async function POST() {
  try {
    const admin = createAdminClient();
    const phone = normalizePhoneNumber(ADMIN_PHONE);
    const email = buildPhoneLoginEmail(phone);

    // Check existing profile
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, auth_user_id, role')
      .eq('phone_number', phone)
      .maybeSingle();

    // Upsert auth user. CreateUser is idempotent on email conflict.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      phone,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { display_name: ADMIN_NAME, login_phone: phone },
    });

    if (createError && !createError.message.includes('already exists') && createError.status !== 422) {
      return NextResponse.json({ ok: false, error: createError.message }, { status: 400 });
    }

    // Resolve auth user id (either freshly created or pre-existing).
    let authUserId = created?.user?.id;
    if (!authUserId) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const user = list?.users?.find((u) => u.email === email || u.phone === phone);
      authUserId = user?.id;
    }

    if (existingProfile) {
      await admin
        .from('profiles')
        .update({ auth_user_id: authUserId, email, role: 'admin', is_active: true })
        .eq('id', existingProfile.id);
      return NextResponse.json({ ok: true, status: 'updated-existing-profile', id: existingProfile.id });
    }

    const { data: inserted, error: insertError } = await admin
      .from('profiles')
      .insert({
        auth_user_id: authUserId,
        email,
        display_name: ADMIN_NAME,
        role: 'admin',
        phone_number: phone,
        assigned_trainer_id: null,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: 'created', id: inserted.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
