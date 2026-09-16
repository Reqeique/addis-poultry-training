'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminInsights } from '@/components/admin-insights';
import { AdminBottomNav } from '@/components/AdminBottomNav';

export default function AdminInsightsPage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.role !== 'admin') {
      router.push('/');
      return;
    }
    setReady(true);
  }, [profile, authLoading, router]);

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background font-sans text-foreground pb-24">
      <header className="flex items-center px-4 sm:px-6 pt-12 pb-4 justify-between bg-background sticky top-0 z-10">
        <div className="flex min-w-0 items-center gap-4">
          <div className="size-12 shrink-0 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary-foreground font-bold">
            AD
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CEO Dashboard</p>
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">Hi, {profile?.displayName?.split(' ')[0] || 'CEO'}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Sign out" className="text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl lg:max-w-4xl flex-1 min-w-0 px-4 sm:px-6">
        {ready ? (
          <AdminInsights />
        ) : (
          <div className="px-5 py-6 rounded-2xl bg-card border border-border text-muted-foreground text-center text-sm" role="status">
            Loading insights…
          </div>
        )}
      </main>

      <AdminBottomNav />
    </div>
  );
}
