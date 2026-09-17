'use client';
import { Users, ChartColumn, MessageSquare } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';

export function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const value = pathname.startsWith('/admin/insights')
    ? '/admin/insights'
    : pathname.startsWith('/admin/chats')
      ? '/admin/chats'
      : '/admin';

  return (
    <nav aria-label="CEO sections" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg justify-center px-6 py-2">
        <Tabs value={value} onValueChange={(v) => router.push(v)} className="w-full max-w-xs">
          <TabsList aria-label="CEO sections" className="w-full">
            <TabsTab
              value="/admin"
              data-testid="admin-nav-users"
              aria-label="Users"
              className="min-w-0 flex-1 shrink flex-col gap-1.5 py-2.5 h-auto text-[10px] sm:text-[10px] font-bold uppercase tracking-wider"
            >
              <Users className="size-6" />
              <span>Users</span>
            </TabsTab>
            <TabsTab
              value="/admin/insights"
              data-testid="admin-nav-insights"
              aria-label="Insights"
              className="min-w-0 flex-1 shrink flex-col gap-1.5 py-2.5 h-auto text-[10px] sm:text-[10px] font-bold uppercase tracking-wider"
            >
              <ChartColumn className="size-6" />
              <span>Insights</span>
            </TabsTab>
            <TabsTab
              value="/admin/chats"
              data-testid="admin-nav-chats"
              aria-label="Chats"
              className="min-w-0 flex-1 shrink flex-col gap-1.5 py-2.5 h-auto text-[10px] sm:text-[10px] font-bold uppercase tracking-wider"
            >
              <MessageSquare className="size-6" />
              <span>Chats</span>
            </TabsTab>
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}
