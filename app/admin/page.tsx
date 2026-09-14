'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, LogOut, Building2, ChevronRight, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminUser {
  id: string;
  display_name: string;
  phone_number: string;
  role: 'trainer' | 'trainee' | 'admin';
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'trainer' | 'trainee'>('trainee');
  const [focusArea, setFocusArea] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 10_000);
    if (authLoading) return () => clearTimeout(timer);
    clearTimeout(timer);
    if (!profile) {
      setLoading(false);
      return;
    }
    if (profile.role !== 'admin') {
      router.push('/');
      return;
    }
    void fetchUsers();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading, router]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch users');
      setUsers(json.users ?? []);
    } catch (e: any) {
      console.error('Fetch users error:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          phoneNumber,
          password,
          role,
          focusArea: role === 'trainee' ? focusArea : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Could not create user');
      }
      // Reset
      setDisplayName('');
      setPhoneNumber('');
      setPassword('');
      setFocusArea('');
      setShowForm(false);
      await fetchUsers();
    } catch (e: any) {
      setFormError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = users.filter((u) =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number.includes(search),
  );

  const trainers = filtered.filter((u) => u.role === 'trainer');
  const trainees = filtered.filter((u) => u.role === 'trainee');
  const admins = filtered.filter((u) => u.role === 'admin');

  // Shell-first: header renders instantly, stats + lists shimmer while loading.
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background font-sans text-foreground pb-24">
      <header className="flex items-center px-6 pt-12 pb-4 justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary-foreground font-bold">
            AD
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Dashboard</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hi, {profile?.displayName?.split(' ')[0] || 'Admin'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex size-11 items-center justify-center rounded-full bg-card border shadow-sm text-foreground hover:text-primary transition-colors ${showSearch ? 'border-primary text-primary' : 'border-border hover:border-primary'}`}
            aria-label="Toggle search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="flex size-11 items-center justify-center rounded-full bg-card border border-border shadow-sm text-red-500 hover:bg-red-50 transition-colors" aria-label="Sign out">
            <LogOut className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="px-6 pb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            placeholder="Search users by name or phone"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:border-primary"
            aria-label="Search users"
          />
        </div>
      )}

      <main className="flex-1 px-6" aria-busy={loading}>
        {/* Stats */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 mb-6" role="status" aria-label={loading ? 'Loading stats' : 'Stats'}>
          <StatTile label="Trainers" value={loading ? undefined : trainers.length} icon={<UserPlus className="w-4 h-4" />} />
          <StatTile label="Trainees" value={loading ? undefined : trainees.length} icon={<Users className="w-4 h-4" />} />
          <StatTile label="Admins" value={loading ? undefined : admins.length} icon={<Building2 className="w-4 h-4" />} />
        </div>

        {/* Register new user */}
        <section className="mb-6">
          <button
            onClick={() => setShowForm((s) => !s)}
            data-testid="admin-toggle-form"
            className="w-full flex items-center justify-between px-5 py-4 rounded-3xl bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-2 font-semibold">
              <UserPlus className="w-5 h-5" />
              {showForm ? 'Close form' : 'Register a new user'}
            </span>
            <ChevronRight className={`w-5 h-5 transition-transform ${showForm ? 'rotate-90' : ''}`} />
          </button>

          {showForm && (
            <form
              onSubmit={handleCreateUser}
              className="mt-4 bg-card border border-border shadow-sm rounded-3xl p-5 grid gap-3"
              data-testid="admin-create-form"
            >
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'trainer' | 'trainee')}
                  className="px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:border-primary"
                  data-testid="admin-role"
                >
                  <option value="trainee">Trainee</option>
                  <option value="trainer">Trainer</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Display name</span>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name"
                  className="px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:border-primary"
                  data-testid="admin-displayName"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone number</span>
                <input
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+2519XXXXXXXX"
                  className="px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:border-primary"
                  data-testid="admin-phone"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:border-primary"
                  data-testid="admin-password"
                />
              </label>

              {role === 'trainee' && (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Focus area (optional)</span>
                  <input
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g. Broiler, Egg production"
                    className="px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:border-primary"
                    data-testid="admin-focusArea"
                  />
                </label>
              )}

              {formError && (
                <p className="text-red-600 text-sm" data-testid="admin-form-error">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                data-testid="admin-submit"
                className="mt-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create user'}
              </button>
            </form>
          )}
        </section>

        <UserList title={loading ? 'Trainers' : `Trainers (${trainers.length})`} users={loading ? [] : trainers} testPrefix="admin-trainer" loading={loading} />
        <UserList title={loading ? 'Trainees' : `Trainees (${trainees.length})`} users={loading ? [] : trainees} testPrefix="admin-trainee" loading={loading} />
        {!loading && admins.length > 0 && <UserList title={`Admins (${admins.length})`} users={admins} testPrefix="admin-admin" />}
      </main>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number | undefined; icon: React.ReactNode }) {
  return (
    <div className="min-w-[140px] flex flex-col gap-2 rounded-3xl p-5 bg-card shadow-sm border border-border">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full bg-success/15 flex items-center justify-center text-primary-foreground">{icon}</div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      {value === undefined ? (
        <Skeleton className="h-9 w-14" />
      ) : (
        <p className="text-3xl font-bold text-foreground">{value}</p>
      )}
    </div>
  );
}

function UserList({ title, users, testPrefix, loading = false }: { title: string; users: AdminUser[]; testPrefix: string; loading?: boolean }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-foreground mb-3">{title}</h2>
      <ul className="grid gap-2" data-testid={`${testPrefix}-list`}>
        {loading ? (
          [0, 1].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))
        ) : users.length === 0 ? (
          <li className="px-5 py-6 rounded-2xl bg-card border border-border text-muted-foreground text-center text-sm">No users yet</li>
        ) : users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm"
            data-testid={testPrefix}
          >
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-foreground font-bold">
              {u.display_name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{u.display_name}</p>
              <p className="text-sm text-muted-foreground">{u.phone_number}</p>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${u.is_active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {u.is_active ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
