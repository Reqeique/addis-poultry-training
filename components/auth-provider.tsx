'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserProfile } from '@/lib/store';

/**
 * Fetch the profile for the currently signed-in user.
 *
 * Two-tier approach — works on BOTH web and Android Capacitor:
 *
 *  Tier 1 – Direct query by auth_user_id (standard path)
 *    • Look up the profile row that is already linked to the authenticated user ID.
 *
 *  Tier 2 – Query by email & link (first-login fallback)
 *    • Look up by email (handles pre-seeded/new accounts where auth_user_id is not set yet).
 *    • If found, update the profile row to set auth_user_id = user.id.
 *    • Safe due to updated RLS policies allowing reads and updates of unlinked rows by email match.
 */
async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string | undefined,
) {
  // 1. Try direct query by auth_user_id (already linked path)
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle();

  // 2. Fallback: query by email (handles first login for pre-seeded accounts)
  if (!profile && userEmail) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (byEmail) {
      // Link the profile row to this auth user
      const { data: updated } = await supabase
        .from('profiles')
        .update({ auth_user_id: userId })
        .eq('id', byEmail.id)
        .select()
        .maybeSingle();

      if (updated) {
        profile = updated;
      }
    }
  }

  return profile ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setProfile, setLoading } = useAuthStore();

  // Stabilise the client reference — createClient() must not be called on
  // every render, otherwise the useEffect dependency changes and the
  // subscription is torn down / re-created on every render cycle.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // 1. Listen for auth changes synchronously and update store user
  useEffect(() => {
    // Safety net: if onAuthStateChange never fires within 7 s
    // (e.g. Supabase Auth server unreachable, session cookie validation hangs),
    // unblock the UI so the user sees the login form instead of a blank spinner.
    const safetyTimer = setTimeout(() => {
      console.warn('[AuthProvider] auth state did not resolve in 7 s — unblocking UI');
      setLoading(false);
    }, 7_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Auth fired — cancel the safety net
      clearTimeout(safetyTimer);

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // If no user, resolve loading and handle redirect immediately
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        const currentPath = window.location.pathname;
        if (currentPath !== '/') {
          window.location.replace('/');
        }
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser, setProfile, setLoading]);

  // 2. Fetch profile when user changes (decoupled from onAuthStateChange to avoid deadlock)
  useEffect(() => {
    if (!user) return;

    const safetyTimer = setTimeout(() => {
      console.warn('[AuthProvider] loadProfile did not resolve in 7 s — unblocking UI');
      setLoading(false);
    }, 7_000);

    const loadProfile = async () => {
      const currentPath = window.location.pathname;

      try {
        // --- Primary: query Supabase directly (works on Android + web) ---
        const profile = await fetchProfile(supabase, user.id, user.email);

        if (profile) {
          if (!profile.is_active) {
            await supabase.auth.signOut();
            setProfile(null);
            window.location.replace('/');
            return;
          }

          const storeProfile: UserProfile = {
            uid: profile.id,
            email: profile.email || '',
            displayName: profile.display_name,
            photoURL: profile.photo_url || '',
            role: profile.role as 'trainer' | 'trainee' | 'admin',
            focusArea: profile.focus_area || '',
            assignedTrainerId: profile.assigned_trainer_id || '',
            phoneNumber: profile.phone_number,
            location: profile.location || '',
            farmSize: profile.farm_size || '',
            flockCount: profile.flock_count || 0,
            isActive: profile.is_active,
            createdAt: profile.created_at,
            subscriptionExpiresAt: profile.subscription_expires_at ?? null,
            lastPaymentAt: profile.last_payment_at ?? null,
          };

          setProfile(storeProfile);

          // Redirect to the correct dashboard when on the login page
          if (currentPath === '/') {
            const next = storeProfile.role === 'trainer'
              ? '/trainer'
              : storeProfile.role === 'admin'
              ? '/admin'
              : '/trainee';
            window.location.replace(next);
          }
        } else {
          // No profile found — sign out and send back to login
          await supabase.auth.signOut();
          setProfile(null);
          if (currentPath !== '/') {
            window.location.replace('/');
          }
        }
      } catch (err) {
        console.error('[AuthProvider] loadProfile error:', err);
        setProfile(null);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      clearTimeout(safetyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setProfile, setLoading]);

  return <>{children}</>;
}
