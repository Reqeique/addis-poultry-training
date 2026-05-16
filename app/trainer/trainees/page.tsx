'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserProfile } from '@/lib/store';
import { Loader2, Phone, Sprout, Users } from 'lucide-react';

export default function TraineesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trainees, setTrainees] = useState<UserProfile[]>([]);
  const [form, setForm] = useState({
    displayName: '',
    phoneNumber: '',
    password: '',
    focusArea: '',
    farmSize: '',
    flockCount: '',
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    if (profile.uid.startsWith('mock-')) {
      setLoading(false);
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
        setTrainees((data || []).map((row) => ({
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
        })));
      }

      setLoading(false);
    };

    fetchTrainees();
  }, [profile, router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const normalizedPhone = form.phoneNumber.startsWith('+')
        ? form.phoneNumber
        : `+${form.phoneNumber}`;

      if (profile.uid.startsWith('mock-')) {
        const mockTrainee: UserProfile = {
          uid: `mock-${Date.now()}`,
          email: '',
          displayName: form.displayName.trim(),
          role: 'trainee',
          phoneNumber: normalizedPhone,
          focusArea: form.focusArea.trim() || '',
          farmSize: form.farmSize.trim() || '',
          flockCount: form.flockCount ? Number(form.flockCount) : 0,
          assignedTrainerId: profile.uid,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        setTrainees((current) => [mockTrainee, ...current]);
        setSuccess('Trainee added to the demo roster.');
        setForm({
          displayName: '',
          phoneNumber: '',
          password: '',
          focusArea: '',
          farmSize: '',
          flockCount: '',
        });
        return;
      }

      const response = await fetch('/api/trainer/trainees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error(result.error || 'Could not create trainee account.');
      }

      setSuccess('Trainee added. They can now sign in with their phone number and password.');
      setForm({
        displayName: '',
        phoneNumber: '',
        password: '',
        focusArea: '',
        farmSize: '',
        flockCount: '',
      });

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee')
        .eq('assigned_trainer_id', profile.uid)
        .order('created_at', { ascending: false });

      setTrainees((data || []).map((row) => ({
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
      })));
    } catch (submitError: any) {
      setError(submitError.message || 'Could not add trainee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background-light font-sans text-slate-900 pb-24">
      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">All Trainees</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage your trainee roster and preload who can sign in.</p>
      </header>
      <main className="px-6 flex-1 flex flex-col gap-6">
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Add trainee</h2>
            <p className="text-sm text-slate-500 mt-1">Each trainee gets a phone-based login backed by a password, with no OTP.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-2xl bg-[#E5F5E5] px-4 py-3 text-sm font-medium text-primary-dark">
              {success}
            </div>
          )}

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-primary"
              placeholder="Full name"
              value={form.displayName}
              onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))}
              required
            />
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-primary"
                placeholder="Phone number"
                value={form.phoneNumber}
                onChange={(e) => setForm((current) => ({ ...current, phoneNumber: e.target.value }))}
                required
              />
            </div>
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-primary"
              placeholder="Temporary password"
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              required
            />
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-primary"
              placeholder="Focus area"
              value={form.focusArea}
              onChange={(e) => setForm((current) => ({ ...current, focusArea: e.target.value }))}
            />
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-primary"
              placeholder="Farm size"
              value={form.farmSize}
              onChange={(e) => setForm((current) => ({ ...current, farmSize: e.target.value }))}
            />
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-primary"
              placeholder="Flock count"
              type="number"
              min="0"
              value={form.flockCount}
              onChange={(e) => setForm((current) => ({ ...current, flockCount: e.target.value }))}
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-dark transition-colors hover:bg-[#7ED465] disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
              <span>{submitting ? 'Adding...' : 'Add Trainee'}</span>
            </button>
          </form>
        </section>

        <section className="flex-1">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Preloaded trainees</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : trainees.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Trainees Yet</h3>
              <p className="text-sm text-slate-500 max-w-[240px] leading-relaxed">
                Add a trainee above to create a phone login with a password for them.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {trainees.map((trainee) => (
                <div key={trainee.uid} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{trainee.displayName}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">{trainee.phoneNumber}</p>
                      {(trainee.focusArea || trainee.farmSize || trainee.flockCount) && (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {[trainee.focusArea, trainee.farmSize, trainee.flockCount ? `${trainee.flockCount} birds` : '']
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${trainee.isActive === false ? 'bg-red-100 text-red-700' : 'bg-[#E5F5E5] text-primary-dark'}`}>
                      {trainee.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <TrainerBottomNav />
    </div>
  );
}
