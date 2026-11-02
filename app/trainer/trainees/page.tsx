'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserProfile } from '@/lib/store';
import { Phone, Sprout, Users, Eye, EyeOff } from 'lucide-react';
import { resolveApiUrl } from '@/lib/api-helper';
import { normalizePhoneNumber } from '@/lib/auth/phone-email';
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
    phoneNumber: '+251',
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
            subscriptionExpiresAt: row.subscription_expires_at ?? null,
            lastPaymentAt: row.last_payment_at ?? null,
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

      const normalizedPhone = normalizePhoneNumber(form.phoneNumber);

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

      setSuccess('Farmer added with 12 months access. They can now sign in with their phone number.');
      setForm({ displayName: '', phoneNumber: '+251', password: '', focusArea: '', farmSize: '', flockCount: '' });

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
          subscriptionExpiresAt: row.subscription_expires_at ?? null,
          lastPaymentAt: row.last_payment_at ?? null,
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
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sprout className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supervisor Portal</p>
              <h1 className="font-heading text-xl font-bold tracking-tight">All Farmers</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add farmer</CardTitle>
            <CardDescription>
              Register a new farmer with a phone number and 12-month access.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            {error && (
              <Alert variant="error" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="trainee-name">Full name</FieldLabel>
                <Input
                  id="trainee-name"
                  placeholder="e.g. Almaz Tadesse"
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
                    className="pl-9 font-mono"
                    placeholder="+251 9... or +251 7..."
                    value={form.phoneNumber}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val || val === '+' || val === '+2' || val === '+25') {
                        val = '+251';
                      } else if (val.startsWith('0') && val.length > 1) {
                        val = '+251' + val.slice(1);
                      } else if (!val.startsWith('+')) {
                        val = '+251' + val;
                      }
                      setForm((c) => ({ ...c, phoneNumber: val }));
                    }}
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
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </span>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="trainee-focus">Focus area</FieldLabel>
                  <Input
                    id="trainee-focus"
                    placeholder="e.g. Broilers, Layers, General"
                    value={form.focusArea}
                    onChange={(e) => setForm((c) => ({ ...c, focusArea: e.target.value }))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="trainee-farmsize">Farm size</FieldLabel>
                  <Input
                    id="trainee-farmsize"
                    placeholder="e.g. 500 sq meters"
                    value={form.farmSize}
                    onChange={(e) => setForm((c) => ({ ...c, farmSize: e.target.value }))}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="trainee-flock">Flock count</FieldLabel>
                <Input
                  id="trainee-flock"
                  type="number"
                  min="0"
                  placeholder="e.g. 250"
                  value={form.flockCount}
                  onChange={(e) => setForm((c) => ({ ...c, flockCount: e.target.value }))}
                />
              </Field>
              <Button type="submit" loading={submitting} className="mt-2 w-full">
                Add Farmer
              </Button>
            </form>
          </CardPanel>
        </Card>

        <section aria-label="Assigned farmers">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-heading text-xl font-bold tracking-tight">Your Farmers ({trainees.length})</h2>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
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
                          <span className="mt-0.5 block font-mono text-sm text-muted-foreground">{trainee.phoneNumber}</span>
                          {(trainee.focusArea || trainee.farmSize || trainee.flockCount) && (
                            <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {[trainee.focusArea, trainee.farmSize, trainee.flockCount ? `${trainee.flockCount} birds` : '']
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                        </span>
                      </span>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={trainee.isActive === false ? 'destructive' : 'success'} size="sm">
                          {trainee.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                        </Badge>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          12-Mo Access
                        </span>
                      </div>
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
