'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, BellRing, Settings2, HelpCircle } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { TraineeBottomNav } from '@/components/TraineeBottomNav';

export default function TraineeProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { isAmharic, setIsAmharic } = useAppStore();
  const { profile } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleLanguage = () => {
    setIsAmharic(!isAmharic);
  };

  const navItems = [
    { icon: User, label: isAmharic ? 'የግል መረጃ' : 'Personal Info', description: isAmharic ? 'ስም እና ኢሜይል' : 'Name and email', onClick: () => {} },
    { icon: BellRing, label: isAmharic ? 'ማሳወቂያዎች' : 'Notifications', description: isAmharic ? 'የማሳወቂያ ምርጫዎች' : 'Alert preferences', onClick: () => {} },
    { icon: Settings2, label: isAmharic ? 'የቋንቋ ምርጫ' : 'Language', description: isAmharic ? 'አማርኛ' : 'English', onClick: toggleLanguage },
    { icon: HelpCircle, label: isAmharic ? 'እርዳታ' : 'Help & Support', description: isAmharic ? 'ጥያቄዎች እና መልሶች' : 'FAQ and contact', onClick: () => {} },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background-light font-sans text-slate-900 pb-24">
      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">{isAmharic ? 'መገለጫ' : 'Profile'}</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">{isAmharic ? 'የመተግበሪያ ቅንብሮች ያቀናብሩ' : 'Manage your app settings'}</p>
      </header>
      <main className="px-6 flex-1 flex flex-col items-center">
        
        <div className="w-full max-w-sm mb-8 flex flex-col gap-3">
          {navItems.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/50 transition-colors shadow-sm text-left">
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
          {isAmharic ? 'ውጣ' : 'Log Out'}
        </button>

        {profile && (
          <p className="text-xs text-slate-400 mt-8 font-medium">
            {isAmharic ? 'በዚህ ገብተዋል፡' : 'Logged in as'} {profile.email || profile.phoneNumber}
          </p>
        )}
      </main>
      <TraineeBottomNav isAmharic={isAmharic} />
    </div>
  );
}
