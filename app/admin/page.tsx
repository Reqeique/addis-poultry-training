'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, LogOut, Building2, ChevronRight, Search, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  display_name: string;
  phone_number: string;
  role: 'trainer' | 'trainee' | 'admin';
  is_active: boolean;
  focus_area: string | null;
  farm_size: string | null;
  flock_count: number | null;
  created_at: string;
}

type RoleFilter = 'trainer' | 'trainee' | 'admin';

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

  // Edit + delete state (full CRUD)
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    phoneNumber: '',
    role: 'trainee' as RoleFilter,
    focusArea: '',
    farmSize: '',
    flockCount: '',
    isActive: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

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

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

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
      showToast('User created.');
    } catch (e: any) {
      setFormError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(user: AdminUser) {
    setEditForm({
      displayName: user.display_name,
      phoneNumber: user.phone_number,
      role: user.role,
      focusArea: user.focus_area || '',
      farmSize: user.farm_size || '',
      flockCount: user.flock_count != null ? String(user.flock_count) : '',
      isActive: user.is_active,
    });
    setEditError(null);
    setEditing(user);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          displayName: editForm.displayName,
          phoneNumber: editForm.phoneNumber,
          role: editForm.role,
          focusArea: editForm.focusArea,
          farmSize: editForm.farmSize,
          flockCount: editForm.flockCount,
          isActive: editForm.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not update user');
      setEditing(null);
      await fetchUsers();
      showToast('User updated.');
    } catch (e: any) {
      setEditError(e.message || String(e));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleActive(user: AdminUser, next: boolean) {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: next } : u)));
    setActionError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not update user');
      showToast(next ? 'User activated.' : 'User deactivated.');
    } catch (e: any) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: !next } : u)));
      setActionError(e.message || String(e));
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not delete user');
      setDeleting(null);
      await fetchUsers();
      showToast('User deleted.');
    } catch (e: any) {
      setActionError(e.message || String(e));
    } finally {
      setDeletingBusy(false);
    }
  }

  const filtered = users.filter((u) =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number.includes(search),
  );

  const trainers = filtered.filter((u) => u.role === 'trainer');
  const trainees = filtered.filter((u) => u.role === 'trainee');
  const admins = filtered.filter((u) => u.role === 'admin');
  const selfId = profile?.uid ?? null;

  // Shell-first: header renders instantly, stats + lists shimmer while loading.
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background font-sans text-foreground pb-24">
      {toast && (
        <div className="fixed left-1/2 top-6 z-[110] -translate-x-1/2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}
      <header className="flex items-center px-6 pt-12 pb-4 justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary-foreground font-bold">
            AD
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CEO Dashboard</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hi, {profile?.displayName?.split(' ')[0] || 'CEO'}</h1>
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
          <StatTile label="CEOs" value={loading ? undefined : admins.length} icon={<Building2 className="w-4 h-4" />} />
        </div>

        {actionError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
            {actionError}
          </div>
        )}

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

        <UserList
          title={loading ? 'Trainers' : `Trainers (${trainers.length})`}
          users={loading ? [] : trainers}
          testPrefix="admin-trainer"
          loading={loading}
          selfId={selfId}
          onEdit={openEdit}
          onToggle={handleToggleActive}
          onDelete={setDeleting}
        />
        <UserList
          title={loading ? 'Trainees' : `Trainees (${trainees.length})`}
          users={loading ? [] : trainees}
          testPrefix="admin-trainee"
          loading={loading}
          selfId={selfId}
          onEdit={openEdit}
          onToggle={handleToggleActive}
          onDelete={setDeleting}
        />
        {!loading && admins.length > 0 && (
          <UserList
            title={`CEOs (${admins.length})`}
            users={admins}
            testPrefix="admin-admin"
            selfId={selfId}
            onEdit={openEdit}
            onToggle={handleToggleActive}
            onDelete={setDeleting}
          />
        )}
      </main>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogPopup data-testid="admin-edit-dialog">
          {editing && (
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Edit user</DialogTitle>
                <DialogDescription>Update {editing.display_name}&apos;s account. Phone changes update their login.</DialogDescription>
              </DialogHeader>
              <DialogPanel className="flex flex-col gap-3">
                {editError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" data-testid="admin-edit-error">
                    {editError}
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="admin-edit-name">Display name</FieldLabel>
                  <Input
                    id="admin-edit-name"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                    required
                    data-testid="admin-edit-displayName"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin-edit-phone">Phone number</FieldLabel>
                  <Input
                    id="admin-edit-phone"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    required
                    data-testid="admin-edit-phone"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin-edit-role">Role</FieldLabel>
                  <select
                    id="admin-edit-role"
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as RoleFilter }))}
                    disabled={editing.id === selfId}
                    title={editing.id === selfId ? 'You cannot change your own role' : undefined}
                    className="h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm outline-none focus:border-ring disabled:opacity-50"
                    data-testid="admin-edit-role"
                  >
                    <option value="trainee">Trainee</option>
                    <option value="trainer">Trainer</option>
                    <option value="admin">CEO</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="admin-edit-focus">Focus area</FieldLabel>
                    <Input
                      id="admin-edit-focus"
                      value={editForm.focusArea}
                      onChange={(e) => setEditForm((f) => ({ ...f, focusArea: e.target.value }))}
                      data-testid="admin-edit-focusArea"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="admin-edit-farm">Farm size</FieldLabel>
                    <Input
                      id="admin-edit-farm"
                      value={editForm.farmSize}
                      onChange={(e) => setEditForm((f) => ({ ...f, farmSize: e.target.value }))}
                      data-testid="admin-edit-farmSize"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="admin-edit-flock">Flock count</FieldLabel>
                  <Input
                    id="admin-edit-flock"
                    type="number"
                    min="0"
                    value={editForm.flockCount}
                    onChange={(e) => setEditForm((f) => ({ ...f, flockCount: e.target.value }))}
                    data-testid="admin-edit-flockCount"
                  />
                </Field>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
                  <span className="text-sm font-semibold">Account active</span>
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(next) => setEditForm((f) => ({ ...f, isActive: next }))}
                    disabled={editing.id === selfId}
                    aria-label={editing.id === selfId ? 'Cannot deactivate your own account' : 'Account active'}
                    data-testid="admin-edit-active"
                  />
                </div>
              </DialogPanel>
              <DialogFooter>
                <Button type="submit" loading={savingEdit} className="w-full" data-testid="admin-edit-save">
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogPopup>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && !deletingBusy && setDeleting(null)}>
        <AlertDialogPopup data-testid="admin-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes their profile and login. Users with chat or inquiry history cannot be deleted — deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} loading={deletingBusy} data-testid="admin-delete-confirm">
              Delete user
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
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

function UserList({
  title,
  users,
  testPrefix,
  loading = false,
  selfId,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  users: AdminUser[];
  testPrefix: string;
  loading?: boolean;
  selfId: string | null;
  onEdit: (user: AdminUser) => void;
  onToggle: (user: AdminUser, next: boolean) => void;
  onDelete: (user: AdminUser) => void;
}) {
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
        ) : users.map((u) => {
          const isSelf = selfId != null && u.id === selfId;
          return (
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
              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={u.is_active}
                  onCheckedChange={(next) => onToggle(u, next)}
                  disabled={isSelf}
                  aria-label={isSelf ? 'Cannot change your own account' : `${u.is_active ? 'Deactivate' : 'Activate'} ${u.display_name}`}
                  data-testid={`${testPrefix}-active`}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${u.display_name}`}
                  title={isSelf && u.role === 'admin' ? undefined : `Edit ${u.display_name}`}
                  onClick={() => onEdit(u)}
                  data-testid={`${testPrefix}-edit`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${u.display_name}`}
                  className="text-destructive"
                  disabled={isSelf}
                  title={isSelf ? 'You cannot delete your own account' : `Delete ${u.display_name}`}
                  onClick={() => onDelete(u)}
                  data-testid={`${testPrefix}-delete`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
