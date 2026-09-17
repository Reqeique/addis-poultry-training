'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserProfile } from '@/lib/store';
import { Phone, Sprout, Users, Eye, EyeOff } from 'lucide-react';
import { resolveApiUrl } from '@/lib/api-helper';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardPanel } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export default function TraineesPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trainees, setTrainees] = useState<UserProfile[]>([]);
  const [showPassword, setShowPassword] = useState(true);
  const [form, setForm] = useState({
    displayName: '',
    phoneNumber: '',
    password: '',
    focusArea: '',
    farmSize: '',
    flockCount: '',
  });

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    const fetchTrainees = async () => {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee')
        .eq('assigned_trainer_id', profile.uid)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTrainees(
          (data || []).map((row) => ({
            uid: row.id,
            email: row.email || '',
            displayName: row.display_name,
            photoURL: row.photo_url || '',
            role: row.role,
            focusArea: row.focus_area || '',
            assignedTrainerId: row.assigned_trainer_id || '',
            phoneNumber: row.phone_number,
            farmSize: row.farm_size || '',
            flockCount: row.flock_count || 0,
            isActive: row.is_active,
            createdAt: row.created_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchTrainees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      setError('Your session is still loading or has expired. Please wait a moment or sign in again.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const normalizedPhone = form.phoneNumber.startsWith('+') ? form.phoneNumber : `+${form.phoneNumber}`;

      const response = await fetch(resolveApiUrl('/api/trainer/trainees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          phoneNumber: normalizedPhone,
          password: form.password,
          focusArea: form.focusArea.trim(),
          farmSize: form.farmSize.trim(),
          flockCount: form.flockCount,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create farmer account.');

      setSuccess('Farmer added. They can now sign in with their phone number and password.');
      setForm({ displayName: '', phoneNumber: '', password: '', focusArea: '', farmSize: '', flockCount: '' });

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee')
        .eq('assigned_trainer_id', profile.uid)
        .order('created_at', { ascending: false });

      setTrainees(
        (data || []).map((row) => ({
          uid: row.id,
          email: row.email || '',
          displayName: row.display_name,
          photoURL: row.photo_url || '',
          role: row.role,
          focusArea: row.focus_area || '',
          assignedTrainerId: row.assigned_trainer_id || '',
          phoneNumber: row.phone_number,
          farmSize: row.farm_size || '',
          flockCount: row.flock_count || 0,
          isActive: row.is_active,
          createdAt: row.created_at,
        }))
      );
    } catch (submitError: any) {
      setError(submitError.message || 'Could not add farmer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-6 pb-6 pt-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight">All Farmers</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Manage your farmer roster and preload who can sign in.
        </p>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Add farmer</CardTitle>
            <CardDescription>Each farmer gets a phone-based login backed by a password, with no OTP.</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-3">
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <Field>
                <FieldLabel htmlFor="trainee-name">Full name</FieldLabel>
                <Input
                  id="trainee-name"
                  placeholder="Full name"
                  value={form.displayName}
                  onChange={(e) => setForm((c) => ({ ...c, displayName: e.target.value }))}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="trainee-phone">Phone number</FieldLabel>
                <span className="relative block">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="trainee-phone"
                    className="pl-9"
                    placeholder="Phone number"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((c) => ({ ...c, phoneNumber: e.target.value }))}
                    required
                  />
                </span>
              </Field>
              <Field>
                <FieldLabel htmlFor="trainee-password">Temporary password</FieldLabel>
                <span className="relative block">
                  <Input
                    id="trainee-password"
                    placeholder="Temporary password"
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                    required
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </span>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="trainee-focus">Focus area</FieldLabel>
                  <Input
                    id="trainee-focus"
                    placeholder="Focus area"
                    value={form.focusArea}
                    onChange={(e) => setForm((c) => ({ ...c, focusArea: e.target.value }))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="trainee-farm">Farm size</FieldLabel>
                  <Input
                    id="trainee-farm"
                    placeholder="Farm size"
                    value={form.farmSize}
                    onChange={(e) => setForm((c) => ({ ...c, farmSize: e.target.value }))}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="trainee-flock">Flock count</FieldLabel>
                <Input
                  id="trainee-flock"
                  placeholder="Flock count"
                  type="number"
                  min="0"
                  value={form.flockCount}
                  onChange={(e) => setForm((c) => ({ ...c, flockCount: e.target.value }))}
                />
              </Field>
              <Button type="submit" loading={submitting} className="mt-1">
                <Sprout className="size-4" />
                {submitting ? 'Adding...' : 'Add Farmer'}
              </Button>
            </form>
          </CardPanel>
        </Card>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <Users className="size-5 text-muted-foreground" />
            <h2 className="font-heading text-lg font-bold">Preloaded farmers</h2>
            <Badge variant="secondary">{trainees.length}</Badge>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2" role="status" aria-label="Loading farmers">
              {[0, 1].map((i) => (
                <Card key={i}>
                  <CardPanel className="flex items-center gap-3 p-4">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </CardPanel>
                </Card>
              ))}
            </div>
          ) : trainees.length === 0 ? (
            <Empty>
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-7" />
              </span>
              <EmptyTitle>No Farmers Yet</EmptyTitle>
              <EmptyDescription>Add a farmer above to create a phone login with a password for them.</EmptyDescription>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {trainees.map((trainee) => (
                <li key={trainee.uid}>
                  <Card>
                    <CardPanel className="flex items-start justify-between gap-3 p-4">
                      <span className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>{trainee.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>
                          <span className="block font-semibold">{trainee.displayName}</span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">{trainee.phoneNumber}</span>
                          {(trainee.focusArea || trainee.farmSize || trainee.flockCount) && (
                            <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {[trainee.focusArea, trainee.farmSize, trainee.flockCount ? `${trainee.flockCount} birds` : '']
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                        </span>
                      </span>
                      <Badge variant={trainee.isActive === false ? 'destructive' : 'success'} size="sm">
                        {trainee.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                      </Badge>
                    </CardPanel>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <TrainerBottomNav />
    </div>
  );
}
