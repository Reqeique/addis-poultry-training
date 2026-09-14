'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, LogOut, Building2, ChevronRight, Search, MessageSquare, Clock, Star, Banknote, Activity } from 'lucide-react';

interface AdminUser {
  id: string;
  display_name: string;
  phone_number: string;
  role: 'trainer' | 'trainee' | 'admin';
  is_active: boolean;
  created_at: string;
}

interface Insights {
  messaging: {
    total_messages: number;
    messages_by_role: Record<string, number>;
    top_senders: { id: string; display_name: string; role: string; phone_number: string; count: number }[];
    unreplied_chats: {
      chat_id: string;
      last_sender_name: string;
      last_sender_role: string;
      waiting_on: string;
      last_message: string;
      last_message_time: string;
      hours_waiting: number;
    }[];
    unreplied_count: number;
    pending_inquiries: number;
    responded_inquiries: number;
    total_inquiries: number;
    pending_list: { id: string; trainee_name: string; message: string; created_at: string; hours_waiting: number }[];
  };
  reply_time: {
    avg_reply_seconds_chat: number | null;
    avg_reply_display_chat: string;
    replies_counted: number;
    avg_inquiry_seconds: number | null;
    avg_inquiry_display: string;
    inquiries_counted: number;
  };
  satisfaction: {
    score: number;
    response_rate: number;
    active_rate: number;
    total_inquiries: number;
    responded: number;
    active_trainees: number;
    total_trainees: number;
  };
  revenue: {
    price_etb: number;
    active_subscriptions: number;
    monthly_revenue_etb: number;
    paid_this_month: number;
    paid_this_month_revenue_etb: number;
    monthly: { name: string; revenue: number; payments: number }[];
  };
  employees: {
    id: string;
    display_name: string;
    phone_number: string;
    is_active: boolean;
    last_active: string;
    trainees_assigned: number;
    messages_sent: number;
    inquiries_responded: number;
  }[];
}

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

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
    void fetchInsights();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading, router]);

  async function fetchInsights() {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/admin/insights', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setInsights(json);
    } catch (e) {
      console.error('Fetch insights error:', e);
    } finally {
      setInsightsLoading(false);
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light font-sans text-slate-900 pb-24">
      <header className="flex items-center px-6 pt-12 pb-4 justify-between bg-background-light sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-primary/20 border border-slate-200 flex items-center justify-center text-primary-dark font-bold">
            AD
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Dashboard</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hi, {profile?.displayName?.split(' ')[0] || 'Admin'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex size-11 items-center justify-center rounded-full bg-white border shadow-sm text-slate-700 hover:text-primary transition-colors ${showSearch ? 'border-primary text-primary' : 'border-slate-200 hover:border-primary'}`}
            aria-label="Toggle search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="flex size-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-red-500 hover:bg-red-50 transition-colors" aria-label="Sign out">
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
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
            aria-label="Search users"
          />
        </div>
      )}

      <main className="flex-1 px-6">
        {/* Stats */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 mb-6">
          <StatTile label="Trainers" value={trainers.length} icon={<UserPlus className="w-4 h-4" />} />
          <StatTile label="Trainees" value={trainees.length} icon={<Users className="w-4 h-4" />} />
          <StatTile label="Admins" value={admins.length} icon={<Building2 className="w-4 h-4" />} />
        </div>

        {/* Insights + messaging analytics */}
        <section className="mb-6" data-testid="admin-insights" aria-label="Insights and messaging analytics">
          <h2 className="text-base font-bold text-slate-900 mb-3">Insights & messaging analytics</h2>
          {insightsLoading && !insights ? (
            <div className="px-5 py-6 rounded-2xl bg-white border border-slate-100 text-slate-500 text-center text-sm" role="status">
              Loading insights…
            </div>
          ) : !insights ? (
            <div className="px-5 py-6 rounded-2xl bg-white border border-slate-100 text-slate-500 text-center text-sm">
              Insights unavailable
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
                <StatTile label="Avg reply" value={insights.reply_time.avg_reply_display_chat} icon={<Clock className="w-4 h-4" />} testId="insights-avg-reply" />
                <StatTile label="Inquiry reply" value={insights.reply_time.avg_inquiry_display} icon={<MessageSquare className="w-4 h-4" />} testId="insights-inquiry-reply" />
                <StatTile label="Satisfaction" value={`${insights.satisfaction.score}%`} icon={<Star className="w-4 h-4" />} testId="insights-csat" />
                <StatTile label="Revenue / mo" value={`${insights.revenue.monthly_revenue_etb.toLocaleString()} ETB`} icon={<Banknote className="w-4 h-4" />} testId="insights-revenue" />
                <StatTile label="Unreplied" value={insights.messaging.unreplied_count} icon={<Activity className="w-4 h-4" />} testId="insights-unreplied-count" />
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Messaging volume</p>
                <p className="text-sm text-slate-700" data-testid="insights-volume">
                  {insights.messaging.total_messages} messages · {insights.messaging.messages_by_role.trainer ?? 0} trainer · {insights.messaging.messages_by_role.trainee ?? 0} trainee · {insights.messaging.responded_inquiries}/{insights.messaging.total_inquiries} inquiries answered
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Reply time from {insights.reply_time.replies_counted} chat replies · {insights.reply_time.inquiries_counted} inquiry replies
                </p>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Top senders</p>
                {insights.messaging.top_senders.length === 0 ? (
                  <p className="text-sm text-slate-500">No messages yet</p>
                ) : (
                  <ul className="grid gap-2">
                    {insights.messaging.top_senders.slice(0, 5).map((s) => (
                      <li key={s.id} data-testid="insights-top-sender" className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-900 truncate">{s.display_name} <span className="text-slate-400 font-normal">· {s.role}</span></span>
                        <span className="text-slate-500 font-bold">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                  Waiting for a reply ({insights.messaging.unreplied_count})
                </p>
                {insights.messaging.unreplied_chats.length === 0 && insights.messaging.pending_list.length === 0 ? (
                  <p className="text-sm text-slate-500" data-testid="insights-unreplied-empty">Inbox zero — everyone got a reply</p>
                ) : (
                  <ul className="grid gap-2">
                    {insights.messaging.unreplied_chats.slice(0, 5).map((c) => (
                      <li key={c.chat_id} data-testid="insights-unreplied" className="text-sm border border-slate-100 rounded-2xl px-3 py-2">
                        <p className="font-semibold text-slate-900 truncate">{c.last_sender_name} → {c.waiting_on}</p>
                        <p className="text-slate-500 truncate">{c.last_message || '(media message)'}</p>
                        <p className="text-xs text-amber-600 font-semibold">waiting {c.hours_waiting}h</p>
                      </li>
                    ))}
                    {insights.messaging.pending_list.slice(0, 5).map((q) => (
                      <li key={q.id} data-testid="insights-unreplied" className="text-sm border border-slate-100 rounded-2xl px-3 py-2">
                        <p className="font-semibold text-slate-900 truncate">{q.trainee_name} — pending inquiry</p>
                        <p className="text-slate-500 truncate">{q.message}</p>
                        <p className="text-xs text-amber-600 font-semibold">waiting {q.hours_waiting}h</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Customer satisfaction</p>
                <p className="text-sm text-slate-700" data-testid="insights-csat-detail">
                  {insights.satisfaction.score}% overall · {insights.satisfaction.response_rate}% inquiries answered · {insights.satisfaction.active_rate}% trainees active
                </p>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Revenue generated</p>
                <p className="text-sm text-slate-700" data-testid="insights-revenue-detail">
                  {insights.revenue.monthly_revenue_etb.toLocaleString()} ETB/mo from {insights.revenue.active_subscriptions} active × {insights.revenue.price_etb.toLocaleString()} ETB · {insights.revenue.paid_this_month} paid this month
                </p>
                {insights.revenue.monthly.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {insights.revenue.monthly.map((m) => `${m.name}: ${m.revenue.toLocaleString()}`).join(' · ')}
                  </p>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Employee activity</p>
                {insights.employees.length === 0 ? (
                  <p className="text-sm text-slate-500">No trainers yet</p>
                ) : (
                  <ul className="grid gap-2">
                    {insights.employees.slice(0, 8).map((e) => (
                      <li key={e.id} data-testid="insights-employee" className="flex items-center justify-between text-sm gap-2">
                        <span className="font-semibold text-slate-900 truncate">{e.display_name}</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {e.trainees_assigned} trainees · {e.messages_sent} msgs · {e.inquiries_responded} replies
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Register new user */}
        <section className="mb-6">
          <button
            onClick={() => setShowForm((s) => !s)}
            data-testid="admin-toggle-form"
            className="w-full flex items-center justify-between px-5 py-4 rounded-3xl bg-primary text-primary-dark shadow-sm hover:bg-[#7ED465] transition-all active:scale-[0.98]"
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
              className="mt-4 bg-white border border-slate-100 shadow-sm rounded-3xl p-5 grid gap-3"
              data-testid="admin-create-form"
            >
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'trainer' | 'trainee')}
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
                  data-testid="admin-role"
                >
                  <option value="trainee">Trainee</option>
                  <option value="trainer">Trainer</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Display name</span>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name"
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
                  data-testid="admin-displayName"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone number</span>
                <input
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+2519XXXXXXXX"
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
                  data-testid="admin-phone"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
                  data-testid="admin-password"
                />
              </label>

              {role === 'trainee' && (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Focus area (optional)</span>
                  <input
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g. Broiler, Egg production"
                    className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
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
                className="mt-2 px-5 py-3 rounded-2xl bg-primary-dark text-white font-semibold shadow-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create user'}
              </button>
            </form>
          )}
        </section>

        <UserList title={`Trainers (${trainers.length})`} users={trainers} testPrefix="admin-trainer" />
        <UserList title={`Trainees (${trainees.length})`} users={trainees} testPrefix="admin-trainee" />
        {admins.length > 0 && <UserList title={`Admins (${admins.length})`} users={admins} testPrefix="admin-admin" />}
      </main>
    </div>
  );
}

function StatTile({ label, value, icon, testId }: { label: string; value: number | string; icon: React.ReactNode; testId?: string }) {
  return (
    <div className="min-w-[140px] flex flex-col gap-2 rounded-3xl p-5 bg-white shadow-sm border border-slate-100">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full bg-[#E5F5E5] flex items-center justify-center text-primary-dark">{icon}</div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-3xl font-bold text-slate-900" {...(testId ? { 'data-testid': testId } : {})}>{value}</p>
    </div>
  );
}

function UserList({ title, users, testPrefix }: { title: string; users: AdminUser[]; testPrefix: string }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-slate-900 mb-3">{title}</h2>
      <ul className="grid gap-2" data-testid={`${testPrefix}-list`}>
        {users.length === 0 ? (
          <li className="px-5 py-6 rounded-2xl bg-white border border-slate-100 text-slate-500 text-center text-sm">No users yet</li>
        ) : users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm"
            data-testid={testPrefix}
          >
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark font-bold">
              {u.display_name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{u.display_name}</p>
              <p className="text-sm text-slate-500">{u.phone_number}</p>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${u.is_active ? 'text-primary-dark' : 'text-slate-400'}`}>
              {u.is_active ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
