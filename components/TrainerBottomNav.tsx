'use client';
import { Home, Users, Settings, MessageSquare, Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';

const ITEMS = [
  { value: '/trainer', icon: Home, label: 'Home' },
  { value: '/trainer/chats', icon: MessageSquare, label: 'Chats' },
  { value: '/trainer/trainees', icon: Users, label: 'Farmers' },
  { value: '/trainer/alerts', icon: Bell, label: 'Alerts' },
  { value: '/trainer/settings', icon: Settings, label: 'Settings' },
];

function valueForPath(pathname: string): string {
  const hit = ITEMS.find((i) => pathname === i.value || pathname.startsWith(`${i.value}/`));
  return hit ? hit.value : '/trainer';
}

export function TrainerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const value = valueForPath(pathname);

  return (
    <nav aria-label="Supervisor sections" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg justify-center px-3 py-2">
        <Tabs value={value} onValueChange={(v) => router.push(v)} className="w-full max-w-md">
          <TabsList aria-label="Supervisor sections" className="w-full">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTab
                  key={item.value}
                  value={item.value}
                  aria-label={item.label}
                  className="min-w-0 flex-1 shrink flex-col gap-0.5 px-0 py-1 text-[9px] font-bold uppercase tracking-wide"
                >
                  <Icon className="size-5" />
                  <span className="truncate">{item.label}</span>
                </TabsTab>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}
