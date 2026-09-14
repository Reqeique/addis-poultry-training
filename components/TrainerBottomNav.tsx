'use client';
import Link from 'next/link';
import { Home, Users, Settings, Plus, MessageSquare, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LEFT = [
  { href: '/trainer', icon: Home, label: 'Home' },
  { href: '/trainer/chats', icon: MessageSquare, label: 'Messages' },
];

const RIGHT = [
  { href: '/trainer/trainees', icon: Users, label: 'Farmers' },
  { href: '/trainer/alerts', icon: Bell, label: 'Alerts' },
  { href: '/trainer/settings', icon: Settings, label: 'Settings' },
];

function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-[52px] flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

export function TrainerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg items-end justify-around px-3 py-2">
        {LEFT.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <NavLink key={item.href} href={item.href} label={item.label} active={active}>
              <Icon className="size-5" />
            </NavLink>
          );
        })}

        <div className="relative -top-5">
          <Link
            href="/trainer/trainees"
            aria-label="Add farmer"
            className="flex size-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_8px_16px_-6px_var(--primary)] transition-transform active:scale-95"
          >
            <Plus className="size-6" strokeWidth={3} />
          </Link>
        </div>

        {RIGHT.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink key={item.href} href={item.href} label={item.label} active={active}>
              <Icon className="size-5" />
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
