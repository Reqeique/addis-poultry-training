'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore, UserProfile } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Search,
  Zap,
  MessageSquare,
  LogOut,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Home as FarmIcon,
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { RecentChatsSection } from '@/components/RecentChats';
import { fetchRecentChats, type RecentChat } from '@/lib/chat/recent-chats';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="min-w-[140px] flex-1">
      <CardPanel className="flex flex-col gap-2 p-4">
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
            {icon}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        </span>
        <span className="font-heading text-3xl font-bold">{value}</span>
      </CardPanel>
    </Card>
  );
}

export default function TrainerDashboard() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [trainees, setTrainees] = useState<UserProfile[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [chatsCount, setChatsCount] = useState(12);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 10_000);

    if (authLoading) return () => clearTimeout(safetyTimer);

    clearTimeout(safetyTimer);

    if (!profile) {
      setLoading(false);
      setRecentLoading(false);
      return;
    }
    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    const fetchTrainees = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'trainee')
          .eq('assigned_trainer_id', profile.uid);

        if (error) throw error;

        if (data) {
          const mapped = data.map((d) => ({
            uid: d.id,
            displayName: d.display_name,
            email: d.email || '',
            photoURL: d.photo_url || '',
            role: d.role as 'trainer' | 'trainee' | 'admin',
            focusArea: d.focus_area || '',
            phoneNumber: d.phone_number,
            location: d.location || '',
            farmSize: d.farm_size || '',
            flockCount: d.flock_count || 0,
            isActive: d.is_active,
            createdAt: d.created_at,
            subscriptionExpiresAt: d.subscription_expires_at ?? null,
            lastPaymentAt: d.last_payment_at ?? null,
          }));
          setTrainees(mapped as any);
        }

        const { count, error: countError } = await supabase
          .from('chat_participants')
          .select('chat_id', { count: 'exact', head: true })
          .eq('user_id', profile.uid);

        if (countError) throw countError;

        setChatsCount(count || 0);

        try {
          const recent = await fetchRecentChats(supabase, profile.uid, 15);
          setRecentChats(recent);
        } catch (recentErr) {
          console.error('Error fetching recent chats:', recentErr);
        } finally {
          setRecentLoading(false);
        }
      } catch (err) {
        console.error('Error fetching trainees:', err);
        setRecentLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainees();

    const channel = supabase
      .channel('trainer_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `assigned_trainer_id=eq.${profile.uid}`,
        },
        () => {
          fetchTrainees();
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {
        try {
          const recent = await fetchRecentChats(supabase, profile.uid, 15);
          setRecentChats(recent);
        } catch (err) {
          console.error('Error refreshing recent chats:', err);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async () => {
        try {
          const recent = await fetchRecentChats(supabase, profile.uid, 15);
          setRecentChats(recent);
        } catch (err) {
          console.error('Error refreshing recent chats:', err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const activateSubscription = async (trainee: UserProfile) => {
    // Optimistic flip so the switch responds instantly; realtime refetch reconciles.
    setTrainees((prev) => prev.map((t) => (t.uid === trainee.uid ? { ...t, isActive: true } : t)));
    const { error } = await supabase.rpc('activate_trainee_subscription', {
      trainee_profile_id: trainee.uid,
    });
    if (error) {
      console.error('Error activating subscription:', error);
      setTrainees((prev) => prev.map((t) => (t.uid === trainee.uid ? { ...t, isActive: false } : t)));
      alert('Could not activate subscription: ' + error.message);
    }
  };

  const deactivateTrainee = async (trainee: UserProfile) => {
    setTrainees((prev) => prev.map((t) => (t.uid === trainee.uid ? { ...t, isActive: false } : t)));
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', trainee.uid);
    if (error) {
      console.error('Error deactivating trainee:', error);
      setTrainees((prev) => prev.map((t) => (t.uid === trainee.uid ? { ...t, isActive: true } : t)));
      alert('Could not deactivate trainee: ' + error.message);
    }
  };

  // NOTE: no full-page loading gate here on purpose — the shell
  // (header + nav) renders instantly on navigation while content areas
  // show shimmer skeletons until data arrives.

  const filtered = trainees.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      (t.displayName || '').toLowerCase().includes(query) ||
      (t.focusArea || '').toLowerCase().includes(query) ||
      (t.phoneNumber || '').includes(query)
    );
  });

  return (
    <div className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 pb-4 pt-10">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              {profile?.photoURL ? (
                <AvatarImage src={profile.photoURL} alt="Supervisor" />
              ) : (
                <AvatarFallback>
                  {profile?.displayName?.trim()
                    ? profile.displayName.substring(0, 2).toUpperCase()
                    : 'TR'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Supervisor Dashboard
              </p>
              {loading ? (
                <Skeleton className="mt-1 h-6 w-32" aria-label="Loading greeting" />
              ) : (
                <h1 className="font-heading text-xl font-bold tracking-tight">
                  Hi, {profile?.displayName?.split(' ')[0] || 'Supervisor'}
                </h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle search"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="size-5" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Log out" onClick={handleLogout} className="text-destructive">
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6" aria-busy={loading}>
        <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 py-4" role="status" aria-label={loading ? 'Loading stats' : 'Stats'}>
          <StatCard
            icon={<Users className="size-4" />}
            label="Total"
            value={loading ? <Skeleton className="h-8 w-12" /> : trainees.length}
          />
          <StatCard
            icon={<Zap className="size-4" />}
            label="Active"
            value={
              loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                trainees.filter((t) => t.isActive !== false && (t as any).is_active !== false).length
              )
            }
          />
          <StatCard
            icon={<MessageSquare className="size-4" />}
            label="Chats"
            value={loading ? <Skeleton className="h-8 w-12" /> : chatsCount}
          />
        </div>

        {showSearch && (
          <div className="mb-2">
            <Input
              type="search"
              placeholder="Search farmers by name or focus area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search farmers"
            />
          </div>
        )}

        <RecentChatsSection chats={recentChats} loading={recentLoading} />

        <div className="mb-3 mt-8 flex items-center justify-between px-1">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            {searchQuery ? 'Filtered Farmers' : 'Your Farmers'}
          </h2>
          <Button variant="link" size="sm" render={<Link href="/trainer/trainees" />}>
            Manage
          </Button>
        </div>

        <div className="flex flex-col gap-3" role="status" aria-label={loading ? 'Loading farmers' : 'Farmers'}>
          {loading ? (
            [0, 1, 2].map((i) => (
              <Card key={i}>
                <CardPanel className="flex items-center gap-3 p-4">
                  <Skeleton className="size-14 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </CardPanel>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <Empty>
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-7" />
              </span>
              <EmptyTitle>{searchQuery ? 'No matches found' : 'No Farmers Yet'}</EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? `We couldn't find any farmers matching "${searchQuery}"`
                  : "You don't have any farmers assigned to you at the moment."}
              </EmptyDescription>
            </Empty>
          ) : (
            filtered.map((trainee) => {
              const isActive = trainee.isActive !== false && (trainee as any).is_active !== false;
              const expiresAt = trainee.subscriptionExpiresAt ? new Date(trainee.subscriptionExpiresAt) : null;
              const daysLeft = expiresAt ? differenceInDays(expiresAt, new Date()) : null;
              const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;
              const isExpired = daysLeft !== null && daysLeft < 0;

              return (
                <Card key={trainee.uid}>
                  <CardPanel className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTrainee(trainee)}
                        className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`View ${trainee.displayName}`}
                      >
                        <Avatar className="size-14">
                          {trainee.photoURL ? (
                            <AvatarImage src={trainee.photoURL} alt={trainee.displayName} />
                          ) : (
                            <AvatarFallback>{trainee.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          )}
                        </Avatar>
                        <span
                          className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card ${
                            isActive ? 'bg-success' : 'bg-destructive'
                          }`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTrainee(trainee)}
                            className="min-w-0 text-left"
                          >
                            <h3 className="truncate font-heading text-base font-semibold leading-tight">
                              {trainee.displayName}
                            </h3>
                          </button>
                          <Badge variant="secondary" size="sm" className="shrink-0 uppercase">
                            {trainee.focusArea || 'General'}
                          </Badge>
                        </div>
                        <Link
                          href={`/chat?peerId=${trainee.uid}`}
                          className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                        >
                          <MessageSquare className="size-3.5" /> Tap to message
                        </Link>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Subscription
                          </span>
                          <Badge
                            variant={isActive ? (isExpiringSoon ? 'warning' : 'success') : 'destructive'}
                            size="sm"
                          >
                            {isActive ? (isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE') : 'INACTIVE'}
                          </Badge>
                        </span>
                        {expiresAt && (
                          <p
                            className={`text-xs font-medium ${
                              isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'
                            }`}
                          >
                            {isExpired
                              ? `Expired ${format(expiresAt, 'MMM d, yyyy')}`
                              : `Expires ${format(expiresAt, 'MMM d, yyyy')} · ${daysLeft}d left`}
                          </p>
                        )}
                      </div>

                      <Switch
                        checked={isActive}
                        aria-label={isActive ? 'Deactivate trainee' : 'Activate trainee'}
                        onCheckedChange={(next) => {
                          if (next) activateSubscription(trainee);
                          else deactivateTrainee(trainee);
                        }}
                      />
                    </div>
                  </CardPanel>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <Dialog open={selectedTrainee !== null} onOpenChange={(open) => !open && setSelectedTrainee(null)}>
        <DialogPopup>
          {selectedTrainee && (
            <>
              <DialogHeader className="items-center pb-0 text-center">
                <Avatar className="size-20">
                  {selectedTrainee.photoURL ? (
                    <AvatarImage src={selectedTrainee.photoURL} alt={selectedTrainee.displayName} />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {selectedTrainee.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <DialogTitle className="mt-2 text-center text-xl">{selectedTrainee.displayName}</DialogTitle>
                <DialogDescription>
                  <Badge variant="secondary" size="sm" className="uppercase">
                    {selectedTrainee.focusArea || 'General'}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <DialogPanel className="flex flex-col gap-3">
                {(selectedTrainee.farmSize || selectedTrainee.flockCount) && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
                      <FarmIcon className="size-5" />
                    </span>
                    <span className="text-sm font-medium">
                      {selectedTrainee.farmSize && `${selectedTrainee.farmSize}`}
                      {selectedTrainee.farmSize && selectedTrainee.flockCount ? ' • ' : ''}
                      {selectedTrainee.flockCount ? `${selectedTrainee.flockCount.toLocaleString()} birds` : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
                    <Calendar className="size-5" />
                  </span>
                  <span className="text-sm font-medium">
                    Joined{' '}
                    {selectedTrainee.createdAt
                      ? format(
                          new Date(
                            (selectedTrainee.createdAt as any).toDate
                              ? (selectedTrainee.createdAt as any).toDate()
                              : selectedTrainee.createdAt
                          ),
                          'MMM d, yyyy'
                        )
                      : 'recently'}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
                    <Mail className="size-5" />
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {selectedTrainee.email || 'No email provided'}
                  </span>
                </div>
                {selectedTrainee.phoneNumber && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
                      <Phone className="size-5" />
                    </span>
                    <span className="text-sm font-medium">{selectedTrainee.phoneNumber}</span>
                  </div>
                )}
                {selectedTrainee.location && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
                      <MapPin className="size-5" />
                    </span>
                    <span className="text-sm font-medium">{selectedTrainee.location}</span>
                  </div>
                )}
              </DialogPanel>
              <DialogFooter>
                <Button size="lg" className="w-full" render={<Link href={`/chat?peerId=${selectedTrainee.uid}`} />}>
                  <MessageSquare className="size-5" />
                  Message Farmer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogPopup>
      </Dialog>

      <TrainerBottomNav />
    </div>
  );
}
