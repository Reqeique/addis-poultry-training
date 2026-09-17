'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { LogOut, Search, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardPanel } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { AdminBottomNav } from '@/components/AdminBottomNav';

interface ChatSession {
  chat_id: string;
  last_message: string | null;
  last_message_time: string | null;
  title: string;
  members: { id: string; display_name: string; role: string; phone_number: string }[];
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export default function AdminChatsPage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.role !== 'admin') {
      router.push('/');
      return;
    }
    void fetchChats();
  }, [profile, authLoading, router]);

  async function fetchChats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chats', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setChats(json.chats ?? []);
    } catch (e) {
      console.error('Fetch chats error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function openChat(chatId: string) {
    if (openId === chatId) {
      setOpenId(null);
      return;
    }
    setOpenId(chatId);
    if (messages[chatId]) return;
    try {
      const res = await fetch(`/api/admin/chats/${chatId}/messages`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setMessages((m) => ({ ...m, [chatId]: json.messages ?? [] }));
    } catch (e) {
      console.error('Fetch chat messages error:', e);
    }
  }

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const q = search.toLowerCase();
  const filtered = chats.filter(
    (c) => !q || c.title.toLowerCase().includes(q) || (c.last_message ?? '').toLowerCase().includes(q),
  );

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background font-sans text-foreground pb-24">
      <header className="flex items-center px-4 sm:px-6 pt-12 pb-4 justify-between bg-background sticky top-0 z-10">
        <div className="flex min-w-0 items-center gap-4">
          <div className="size-12 shrink-0 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary-foreground font-bold">
            AD
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CEO Dashboard</p>
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              Hi, {profile?.displayName?.split(' ')[0] || 'CEO'}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowSearch((s) => !s)} aria-label="Toggle search" aria-pressed={showSearch}>
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={fetchChats} aria-label="Refresh chat sessions" data-testid="admin-chats-refresh">
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Sign out" className="text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {showSearch && (
        <div className="px-4 sm:px-6 pb-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            placeholder="Search chats by name or message"
            aria-label="Search chat sessions"
            data-testid="admin-chats-search"
          />
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl lg:max-w-4xl flex-1 min-w-0 px-4 sm:px-6" aria-busy={loading} data-testid="admin-chats">
        <h2 className="text-base font-bold text-foreground mb-3">Chat sessions ({loading ? '…' : filtered.length})</h2>
        {loading ? (
          <div className="grid gap-2" role="status" aria-label="Loading chat sessions">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyTitle>No chat sessions yet</EmptyTitle>
            <EmptyDescription>Farmer ↔ supervisor chats will appear here.</EmptyDescription>
          </Empty>
        ) : (
          <ul className="grid min-w-0 gap-2">
            {filtered.map((c) => (
              <li key={c.chat_id} data-testid="admin-chat" className="min-w-0 max-w-full overflow-hidden">
                <Card className="min-w-0 max-w-full overflow-hidden">
                  <CardPanel className="min-w-0 p-4">
                    <button type="button" onClick={() => openChat(c.chat_id)} className="flex min-w-0 w-full items-center gap-3 text-left">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        <MessageSquare className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{c.title}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {c.last_message || '(media message)'}
                        </span>
                      </span>
                      {c.last_message_time && (
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {new Date(c.last_message_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </button>
                    {openId === c.chat_id && (
                      <div className="mt-3 grid min-w-0 gap-2 border-t border-border pt-3">
                        {(messages[c.chat_id] ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">Loading history…</p>
                        ) : (
                          messages[c.chat_id].map((m) => (
                            <div key={m.id} className="rounded-xl bg-muted/60 px-3 py-2 text-sm min-w-0 max-w-full overflow-hidden">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground truncate">{m.sender_name}</p>
                              <p className="font-medium break-words">{m.text || '(media message)'}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardPanel>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>

      <AdminBottomNav />
    </div>
  );
}
