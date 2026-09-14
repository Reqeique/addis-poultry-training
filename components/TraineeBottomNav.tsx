'use client';
import Link from 'next/link';
import { Home, User, Send } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function TraineeBottomNav({ isAmharic }: { isAmharic: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();

  const labels = {
    home: isAmharic ? 'መነሻ' : 'HOME',
    profile: isAmharic ? 'መገለጫ' : 'PROFILE',
  };

  const handleChatClick = () => {
    if (!profile?.assignedTrainerId) {
      alert('No supervisor has been assigned to you yet. Please contact support.');
      return;
    }
    router.push(`/chat?peerId=${profile.assignedTrainerId}`);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex max-w-lg items-end justify-around px-6 py-2">
        <Link
          href="/trainee"
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
            pathname === '/trainee' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="size-5" />
          <span>{labels.home}</span>
        </Link>

        <div className="relative -top-5">
          <button
            type="button"
            onClick={handleChatClick}
            aria-label="Chat with supervisor"
            className="flex size-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_8px_16px_-6px_var(--primary)] transition-transform active:scale-95"
          >
            <Send className="size-5 -ml-0.5" />
          </button>
        </div>

        <Link
          href="/trainee/profile"
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
            pathname === '/trainee/profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="size-5" />
          <span>{labels.profile}</span>
        </Link>
      </div>
    </nav>
  );
}
