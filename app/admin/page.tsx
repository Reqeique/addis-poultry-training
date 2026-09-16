'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, LogOut, Building2, ChevronRight, Search, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { StatTile } from '@/components/stat-tile';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toastManager } from '@/components/ui/toast';
import { Card, CardPanel } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Empty, EmptyTitle } from '@/components/ui/empty';

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
    toastManager.add({ type: 'success', title: message });
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
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Toggle search"
            aria-pressed={showSearch}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => void fetchUsers()} aria-label="Refresh users" data-testid="admin-refresh">
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
            placeholder="Search users by name or phone"
            aria-label="Search users"
            data-testid="admin-search"
          />
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl lg:max-w-4xl flex-1 min-w-0 px-4 sm:px-6" aria-busy={loading}>
        {/* Stats */}
        <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-4 py-2 mb-6" role="status" aria-label={loading ? 'Loading stats' : 'Stats'}>
          <StatTile label="Trainers" value={loading ? undefined : trainers.length} icon={<UserPlus className="w-4 h-4" />} />
          <StatTile label="Trainees" value={loading ? undefined : trainees.length} icon={<Users className="w-4 h-4" />} />
          <StatTile label="CEOs" value={loading ? undefined : admins.length} icon={<Building2 className="w-4 h-4" />} />
        </div>
        {actionError && (
          <Alert variant="error" className="mb-4">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Register new user */}
        <section className="mb-6">
          <Button
            onClick={() => setShowForm((s) => !s)}
            data-testid="admin-toggle-form"
            size="lg"
            className="w-full justify-between rounded-3xl px-5 py-4"
          >
            <span className="flex items-center gap-2 font-semibold">
              <UserPlus className="w-5 h-5" />
              {showForm ? 'Close form' : 'Register a new user'}
            </span>
            <ChevronRight className={`w-5 h-5 transition-transform ${showForm ? 'rotate-90' : ''}`} />
          </Button>

          {showForm && (
            <form onSubmit={handleCreateUser} data-testid="admin-create-form">
              <Card className="mt-4">
                <CardPanel className="grid gap-3 p-5">
              <Field>
                <FieldLabel htmlFor="admin-role">Role</FieldLabel>
                <Select value={role} onValueChange={(v) => setRole(v as 'trainer' | 'trainee')}>
                  <SelectTrigger data-testid="admin-role" aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="trainee">Trainee</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                  </SelectPopup>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-displayName">Display name</FieldLabel>
                <Input
                  id="admin-displayName"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name"
                  data-testid="admin-displayName"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-phone">Phone number</FieldLabel>
                <Input
                  id="admin-phone"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+2519XXXXXXXX"
                  data-testid="admin-phone"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-password">Password</FieldLabel>
                <Input
                  id="admin-password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder="At least 6 characters"
                  data-testid="admin-password"
                />
              </Field>

              {role === 'trainee' && (
                <Field>
                  <FieldLabel htmlFor="admin-focusArea">Focus area (optional)</FieldLabel>
                  <Input
                    id="admin-focusArea"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g. Broiler, Egg production"
                    data-testid="admin-focusArea"
                  />
                </Field>
              )}

              {formError && (
                <Alert variant="error">
                  <AlertDescription data-testid="admin-form-error">{formError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                loading={submitting}
                data-testid="admin-submit"
                size="lg"
                className="mt-2 w-full"
              >
                {submitting ? 'Creating...' : 'Create user'}
              </Button>
                </CardPanel>
              </Card>
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
        <DialogPopup data-testid="admin-edit-dialog" className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {editing && (
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Edit user</DialogTitle>
                <DialogDescription>Update {editing.display_name}&apos;s account. Phone changes update their login.</DialogDescription>
              </DialogHeader>
              <DialogPanel className="flex flex-col gap-2">
                {editError && (
                  <Alert variant="error">
                    <AlertDescription data-testid="admin-edit-error">{editError}</AlertDescription>
                  </Alert>
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
                  <Select
                    value={editForm.role}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as RoleFilter }))}
                    disabled={editing.id === selfId}
                  >
                    <SelectTrigger id="admin-edit-role" data-testid="admin-edit-role" aria-label="Role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      <SelectItem value="trainee">Trainee</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="admin">CEO</SelectItem>
                    </SelectPopup>
                  </Select>
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
                <Field orientation="horizontal" className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                  <FieldLabel htmlFor="admin-edit-active">Account active</FieldLabel>
                  <Switch
                    id="admin-edit-active"
                    checked={editForm.isActive}
                    onCheckedChange={(next) => setEditForm((f) => ({ ...f, isActive: next }))}
                    disabled={editing.id === selfId}
                    aria-label={editing.id === selfId ? 'Cannot deactivate your own account' : 'Account active'}
                    data-testid="admin-edit-active"
                  />
                </Field>
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
      <AdminBottomNav />
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
    <section className="mb-6 min-w-0">
      <h2 className="text-base font-bold text-foreground mb-3">{title}</h2>
      <ul className="grid min-w-0 gap-2" data-testid={`${testPrefix}-list`}>
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
          <li>
            <Empty className="gap-1 rounded-2xl border border-border bg-card py-6 md:py-6">
              <EmptyTitle className="text-base">No users yet</EmptyTitle>
            </Empty>
          </li>
        ) : users.map((u) => {
          const isSelf = selfId != null && u.id === selfId;
          return (
            <li
              key={u.id}
              className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
              data-testid={testPrefix}
            >
              <Avatar className="size-10 shrink-0 bg-primary/10">
                <AvatarFallback className="bg-primary/10 font-bold text-primary-foreground">
                  {u.display_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{u.display_name}</p>
                <p className="text-sm text-muted-foreground truncate">{u.phone_number}</p>
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
