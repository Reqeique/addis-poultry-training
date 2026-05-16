'use client';
import Link from 'next/link';
import { Home, User, Send } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function TraineeBottomNav({ isAmharic }: { isAmharic: boolean }) {
  const pathname = usePathname();

  const labels = {
    home: isAmharic ? 'መነሻ' : 'HOME',
    profile: isAmharic ? 'መገለጫ' : 'PROFILE',
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 pb-safe">
      <div className="flex items-center justify-around py-4 px-6 max-w-lg mx-auto">
        <Link 
          href="/trainee" 
          className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === '/trainee' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{labels.home}</span>
        </Link>

        <div className="relative -top-6">
          <button className="flex size-14 items-center justify-center bg-primary text-primary-dark rounded-full shadow-[0_8px_16px_-4px_rgba(141,235,113,0.5)] border-4 border-white transition-transform active:scale-95">
            <Send className="w-6 h-6 -ml-0.5" />
          </button>
        </div>

        <Link 
          href="/trainee/profile" 
          className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === '/trainee/profile' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{labels.profile}</span>
        </Link>
      </div>
    </nav>
  );
}
