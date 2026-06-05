import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

export type UserRole = 'trainer' | 'trainee';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  focusArea?: string;
  assignedTrainerId?: string;
  phoneNumber?: string;
  location?: string;
  farmSize?: string;
  flockCount?: number;
  isActive?: boolean;
  createdAt: any;
  subscriptionExpiresAt?: string | null;
  lastPaymentAt?: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));

interface AppState {
  isAmharic: boolean;
  setIsAmharic: (isAmharic: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAmharic: false,
  setIsAmharic: (isAmharic) => set({ isAmharic }),
}));
