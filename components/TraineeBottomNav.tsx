'use client';
import { Home, User, MessageSquare } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';

export function TraineeBottomNav({ isAmharic }: { isAmharic: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();

  const labels = {
    home: isAmharic ? 'መነሻ' : 'Home',
    chats: isAmharic ? 'ውይይቶች' : 'Chats',
    profile: isAmharic ? 'መገለጫ' : 'Profile',
  };

  const value =
    pathname === '/trainee/profile'
      ? '/trainee/profile'
      : pathname.startsWith('/chat')
        ? '/chat'
        : '/trainee';

  const handleValueChange = (v: string) => {
    if (v === '/chat') {
      if (!profile?.assignedTrainerId) {
        alert('No supervisor has been assigned to you yet. Please contact support.');
        return;
      }
      router.push(`/chat?peerId=${profile.assignedTrainerId}`);
      return;
    }
    router.push(v);
  };

  return (
    <nav aria-label="Farmer sections" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg justify-center px-6 py-2">
        <Tabs value={value} onValueChange={handleValueChange} className="w-full max-w-xs">
          <TabsList aria-label="Farmer sections" className="w-full">
            <TabsTab
              value="/trainee"
              aria-label={labels.home}
              className="min-w-0 flex-1 shrink flex-col gap-1 py-1 text-[10px] font-bold uppercase tracking-wider"
            >
              <Home className="size-5" />
              <span className="truncate">{labels.home}</span>
            </TabsTab>
            <TabsTab
              value="/chat"
              aria-label={labels.chats}
              className="min-w-0 flex-1 shrink flex-col gap-1 py-1 text-[10px] font-bold uppercase tracking-wider"
            >
              <MessageSquare className="size-5" />
              <span className="truncate">{labels.chats}</span>
            </TabsTab>
            <TabsTab
              value="/trainee/profile"
              aria-label={labels.profile}
              className="min-w-0 flex-1 shrink flex-col gap-1 py-1 text-[10px] font-bold uppercase tracking-wider"
            >
              <User className="size-5" />
              <span className="truncate">{labels.profile}</span>
            </TabsTab>
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}
