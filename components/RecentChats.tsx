'use client';

import Link from 'next/link';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { formatChatTime, type RecentChat } from '@/lib/chat/recent-chats';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

function PeerAvatar({ chat, size = 'md' }: { chat: RecentChat; size?: 'md' | 'lg' }) {
  const peer = chat.peer;
  const initials = (peer?.displayName || '??').trim().substring(0, 2).toUpperCase();
  return (
    <Avatar className={cn(size === 'lg' ? 'size-14' : 'size-12')}>
      {peer?.photoURL ? (
        <AvatarImage src={peer.photoURL} alt={peer.displayName} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}

export function RecentChatsList({
  chats,
  loading,
  emptyHint = 'New conversations with your trainees will show up here.',
}: {
  chats: RecentChat[];
  loading: boolean;
  emptyHint?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading recent chats">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <Empty>
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MessageSquare className="size-6" />
        </span>
        <EmptyTitle>No recent chats</EmptyTitle>
        <EmptyDescription>{emptyHint}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {chats.map((chat) => {
        const peerName = chat.peer?.displayName || 'Unknown trainee';
        const href = chat.peer ? `/chat?peerId=${chat.peer.uid}` : '#';
        return (
          <li key={chat.chatId}>
            <Link
              href={href}
              aria-label={`Open chat with ${peerName}`}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-border bg-card p-3',
                'shadow-[0_1px_0_0_var(--border)] transition-colors hover:bg-accent/60'
              )}
            >
              <PeerAvatar chat={chat} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{peerName}</span>
                  {chat.lastMessageTime && (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {formatChatTime(chat.lastMessageTime)}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {chat.lastMessage || 'No messages yet — say hello.'}
                </span>
                {chat.peer?.focusArea && (
                  <Badge variant="secondary" size="sm" className="mt-1.5 uppercase">
                    {chat.peer.focusArea}
                  </Badge>
                )}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentChatsSection({
  chats,
  loading,
  title = 'Recent chats',
  actionHref = '/trainer/chats',
}: {
  chats: RecentChat[];
  loading: boolean;
  title?: string;
  actionHref?: string;
}) {
  return (
    <section aria-label={title} className="mt-8">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <Link href={actionHref} className="text-sm font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      <RecentChatsList chats={chats.slice(0, 5)} loading={loading} />
    </section>
  );
}
