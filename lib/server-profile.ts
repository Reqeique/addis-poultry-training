import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { buildPhoneLoginEmail, normalizePhoneNumber } from '@/lib/auth/phone-email';

export interface ServerProfile {
  id: string;
  role: 'trainer' | 'trainee';
  assigned_trainer_id: string | null;
  is_active: boolean;
  email: string | null;
  display_name: string;
  phone_number: string | null;
}

async function linkProfileIfNeeded(user: { id: string; email?: string | null; phone?: string | null }) {
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, role, assigned_trainer_id, is_active, email, display_name, phone_number')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile as ServerProfile;
  }

  const normalizedPhone = user.phone ? normalizePhoneNumber(user.phone) : null;
  const hiddenEmail = normalizedPhone ? buildPhoneLoginEmail(normalizedPhone) : null;
  const lookupEmail = user.email || hiddenEmail;

  let candidateProfile: ServerProfile | null = null;

  if (normalizedPhone) {
    const { data: phoneProfile } = await admin
      .from('profiles')
      .select('id, role, assigned_trainer_id, is_active, email, display_name, phone_number')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (phoneProfile) {
      candidateProfile = phoneProfile as ServerProfile;
    }
  }

  if (!candidateProfile && lookupEmail) {
    const { data: emailProfile } = await admin
      .from('profiles')
      .select('id, role, assigned_trainer_id, is_active, email, display_name, phone_number')
      .eq('email', lookupEmail)
      .maybeSingle();

    if (emailProfile) {
      candidateProfile = emailProfile as ServerProfile;
    }
  }

  if (!candidateProfile) {
    return null;
  }

  const { error } = await admin
    .from('profiles')
    .update({
      auth_user_id: user.id,
      email: lookupEmail,
    })
    .eq('id', candidateProfile.id);

  if (error) {
    throw error;
  }

  return {
    ...candidateProfile,
    email: lookupEmail,
  };
}

export async function getCurrentServerProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null };
  }

  const profile = await linkProfileIfNeeded({
    id: user.id,
    email: user.email,
    phone: user.phone,
  });

  return {
    user,
    profile: (profile as ServerProfile | null) ?? null,
  };
}
