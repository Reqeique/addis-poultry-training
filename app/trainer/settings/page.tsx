'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, BellRing, Settings2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { icon: User, label: 'Account Profile', description: 'Update your personal info' },
    { icon: BellRing, label: 'Notifications', description: 'Configure alert preferences' },
    { icon: Lock, label: 'Privacy & Security', description: 'Password and security settings' },
    { icon: Settings2, label: 'App Preferences', description: 'Language and themes' },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background-light font-sans text-slate-900 pb-24">
      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage your app configureations</p>
      </header>
      <main className="px-6 flex-1 flex flex-col items-center">
        
        <div className="w-full max-w-sm mb-8 flex flex-col gap-3">
          {navItems.map((item, idx) => (
            <button key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/50 transition-colors shadow-sm text-left">
              <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <item.icon className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-[15px]">{item.label}</h3>
                <p className="text-xs text-slate-500 font-medium">{item.description}</p>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={handleLogout}
          className="flex w-full max-w-sm items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-red-200 text-red-500 font-bold hover:bg-red-50 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

        {profile && (
          <p className="text-xs text-slate-400 mt-8 font-medium">Logged in as {profile.email || profile.phoneNumber}</p>
        )}
      </main>
      <TrainerBottomNav />
    </div>
  );
}
