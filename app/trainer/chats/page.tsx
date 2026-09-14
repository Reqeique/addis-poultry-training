'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { RecentChatsList } from '@/components/RecentChats';
import { useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { fetchRecentChats, type RecentChat } from '@/lib/chat/recent-chats';

export default function TrainerChatsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      setLoading(false);
      return;
    }
    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const rows = await fetchRecentChats(supabase, profile.uid, 30);
        if (!cancelled) setChats(rows);
      } catch (err) {
        console.error('Error fetching recent chats:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`trainer_recent_chats:${profile.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        (c.peer?.displayName || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
    );
  }, [chats, query]);

  // Shell-first: header + nav render instantly, list shimmers while loading.
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background font-sans text-foreground pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-6 pt-12 pb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Recent chats</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Pick up where you left off with your farmers.
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search by name or message..."
            aria-label="Search recent chats"
            className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-6" aria-busy={loading}>
        <RecentChatsList
          chats={filtered}
          loading={loading}
          emptyHint={
            query
              ? `No chats match "${query}".`
              : 'New conversations with your trainees will show up here.'
          }
        />
      </main>
      <TrainerBottomNav />
    </div>
  );
}
