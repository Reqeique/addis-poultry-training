'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserProfile } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      
      if (user) {
        const response = await fetch('/api/profile/me', {
          credentials: 'include',
        });

        const result = await response.json().catch(() => ({ profile: null }));
        const profile = result.profile;

        if (profile) {
          if (!profile.is_active) {
            await supabase.auth.signOut();
            setProfile(null);
            router.push('/');
            setLoading(false);
            return;
          }

          const storeProfile: UserProfile = {
            uid: profile.id,
            email: profile.email || '',
            displayName: profile.display_name,
            photoURL: profile.photo_url || '',
            role: profile.role as 'trainer' | 'trainee',
            focusArea: profile.focus_area || '',
            assignedTrainerId: profile.assigned_trainer_id || '',
            phoneNumber: profile.phone_number,
            location: profile.location || '',
            farmSize: profile.farm_size || '',
            flockCount: profile.flock_count || 0,
            isActive: profile.is_active,
            createdAt: profile.created_at,
          };
          
          setProfile(storeProfile);
          
          // Redirect to appropriate dashboard if on login page
          if (pathname === '/') {
            if (storeProfile.role === 'trainer') {
              router.push('/trainer');
            } else {
              router.push('/trainee');
            }
          }
        } else {
          await supabase.auth.signOut();
          setProfile(null);
          if (pathname !== '/') {
            router.push('/');
          }
        }
      } else {
        // Check if we are in bypass mode
        const currentProfile = useAuthStore.getState().profile;
        if (currentProfile?.uid.startsWith('mock-')) {
          setLoading(false);
          return;
        }

        setProfile(null);
        if (pathname !== '/') {
          router.push('/');
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading, router, pathname, supabase]);

  return <>{children}</>;
}
