'use client';
import Link from 'next/link';
import { Home, Users, Settings, Plus } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function TrainerBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/trainer', icon: Home, label: 'Home' },
    { href: '/trainer/trainees', icon: Users, label: 'Trainees' },
  ];

  const navItemsRight = [
    { href: '/trainer/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 pb-safe">
      <div className="flex items-center justify-around py-3 px-6 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1.5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
        
        <div className="relative -top-6">
          <Link href="/trainer/trainees" className="flex size-14 items-center justify-center bg-primary text-primary-dark rounded-full shadow-[0_8px_16px_-4px_rgba(141,235,113,0.5)] border-4 border-white transition-transform active:scale-95">
            <Plus className="w-7 h-7 stroke-[3]" />
          </Link>
        </div>

        {navItemsRight.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1.5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
