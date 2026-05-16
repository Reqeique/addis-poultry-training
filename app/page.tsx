'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Phone } from 'lucide-react';

import { buildPhoneLoginEmail, normalizePhoneNumber } from '@/lib/auth/phone-email';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loading: authLoading, setProfile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const handleBypassTrainer = () => {
    setProfile({
      uid: 'mock-trainer-123',
      email: 'expert@poultry.com',
      displayName: 'Expert Sarah',
      role: 'trainer',
      focusArea: 'Brooding Management',
      phoneNumber: '+251911223344',
      createdAt: new Date()
    });
    router.push('/trainer');
  };

  const handleBypassTrainee = () => {
    setProfile({
      uid: 'mock-trainee-123',
      email: 'farmer@poultry.com',
      displayName: 'Samuel Adebayor',
      role: 'trainee',
      focusArea: 'Marketing',
      phoneNumber: '+251922334455',
      createdAt: new Date()
    });
    router.push('/trainee');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const formattedPhone = normalizePhoneNumber(phoneNumber);
      const email = buildPhoneLoginEmail(formattedPhone);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Could not sign in with phone and password.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background-light font-sans text-slate-900 antialiased p-6 outline-none">
      
      <div className="flex justify-center w-full max-w-[320px] mx-auto mt-12 mb-8">
        <Logo className="w-24 h-24" />
      </div>

      <div className="flex flex-col items-center text-center mb-10">
        <p className="text-slate-600 font-medium text-lg flex items-center gap-2 mb-2">
          Hey 👋 there
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-primary-dark">
          Welcome to <br /> Addis Poultry
        </h1>
      </div>

      <div className="flex flex-col w-full max-w-[400px] mx-auto gap-4 mb-auto">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-2xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="flex flex-col gap-3">
          <div className="relative">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className="flex w-full rounded-full text-slate-900 border-2 border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none h-14 pl-12 pr-5 placeholder:text-slate-400 text-[15px] font-medium transition-all shadow-sm"
              placeholder="Phone number (e.g. +251...)"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className="flex w-full rounded-full text-slate-900 border-2 border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none h-14 pl-12 pr-5 placeholder:text-slate-400 text-[15px] font-medium transition-all shadow-sm"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phoneNumber || !password}
            className="w-full h-14 mt-2 bg-primary hover:bg-[#7ED465] text-primary-dark font-bold rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100 text-base shadow-[0_8px_20px_-4px_rgba(141,235,113,0.4)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Bypass section */}
        <div className="flex gap-2 mt-4 justify-center">
            <span onClick={handleBypassTrainer} className="text-xs text-slate-400 hover:text-primary-dark cursor-pointer font-bold transition-colors">Try Trainer</span>
            <span className="text-xs text-slate-300">•</span>
            <span onClick={handleBypassTrainee} className="text-xs text-slate-400 hover:text-primary-dark cursor-pointer font-bold transition-colors">Try Trainee</span>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 px-4 font-medium leading-relaxed pb-6">
          By continuing you agreeing to <br/><span className="font-bold text-slate-600">Terms of Use</span> and <span className="font-bold text-slate-600">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
