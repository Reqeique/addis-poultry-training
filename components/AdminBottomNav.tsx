'use client';
import Link from 'next/link';
import { Users, ChartColumn } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Users', testId: 'admin-nav-users', Icon: Users },
  { href: '/admin/insights', label: 'Insights', testId: 'admin-nav-insights', Icon: ChartColumn },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="CEO sections" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-6 py-2">
        {ITEMS.map(({ href, label, testId, Icon }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-testid={testId}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-4 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
