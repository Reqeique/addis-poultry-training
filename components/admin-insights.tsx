'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, Clock, Star, Banknote, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTab, TabsPanel } from '@/components/ui/tabs';
import { RoleBars, RevenueTrend, ResponseDonut, TeamActivity } from '@/components/insights-charts';
import { Card, CardPanel } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/stat-tile';

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

export function AdminInsights() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    void fetchInsights();
  }, []);

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

  return (
        <section className="mb-6" data-testid="admin-insights" aria-label="Insights and messaging analytics">
          <h2 className="text-base font-bold text-foreground mb-3">Insights & messaging analytics</h2>
          {insightsLoading && !insights ? (
            <div className="grid gap-2" role="status" aria-label="Loading insights">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : !insights ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Insights unavailable</EmptyTitle>
                <EmptyDescription>Pull to refresh or try again shortly.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Tabs defaultValue="messaging" className="grid gap-3">
              <TabsList aria-label="Insight categories" className="w-full max-w-full">
                <TabsTab value="messaging" data-testid="insights-tab-messaging" className="min-w-0 flex-1 shrink px-1 text-[13px] sm:text-sm">Messaging</TabsTab>
                <TabsTab value="satisfaction" data-testid="insights-tab-satisfaction" className="min-w-0 flex-1 shrink px-1 text-[13px] sm:text-sm">Satisfaction</TabsTab>
                <TabsTab value="revenue" data-testid="insights-tab-revenue" className="min-w-0 flex-1 shrink px-1 text-[13px] sm:text-sm">Revenue</TabsTab>
                <TabsTab value="team" data-testid="insights-tab-team" className="min-w-0 flex-1 shrink px-1 text-[13px] sm:text-sm">Team</TabsTab>
              </TabsList>
              <TabsPanel value="messaging" className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Avg reply" value={insights.reply_time.avg_reply_display_chat} icon={<Clock className="w-4 h-4" />} testId="insights-avg-reply" />
                <StatTile label="Inquiry reply" value={insights.reply_time.avg_inquiry_display} icon={<MessageSquare className="w-4 h-4" />} testId="insights-inquiry-reply" />
                <StatTile label="Unreplied" value={insights.messaging.unreplied_count} icon={<Activity className="w-4 h-4" />} testId="insights-unreplied-count" />
              </div>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Messaging volume</p>
                <p className="text-sm text-foreground" data-testid="insights-volume">
                  {insights.messaging.total_messages} messages · {insights.messaging.messages_by_role.trainer ?? 0} trainer · {insights.messaging.messages_by_role.trainee ?? 0} trainee · {insights.messaging.responded_inquiries}/{insights.messaging.total_inquiries} inquiries answered
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reply time from {insights.reply_time.replies_counted} chat replies · {insights.reply_time.inquiries_counted} inquiry replies
                </p>
              </CardPanel>
            </Card>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Messages by role</p>
                <RoleBars
                  data={[
                    { name: 'Supervisors', value: insights.messaging.messages_by_role.trainer ?? 0 },
                    { name: 'Farmers', value: insights.messaging.messages_by_role.trainee ?? 0 },
                    { name: 'Admins', value: insights.messaging.messages_by_role.admin ?? 0 },
                  ]}
                />
              </CardPanel>
            </Card>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Top senders</p>
                {insights.messaging.top_senders.length === 0 ? (
                  <Empty className="gap-1 py-4 md:py-4"><EmptyDescription>No messages yet</EmptyDescription></Empty>
                ) : (
                  <ul className="grid gap-2">
                    {insights.messaging.top_senders.slice(0, 5).map((s) => (
                      <li key={s.id} data-testid="insights-top-sender" className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground truncate">{s.display_name} <span className="text-muted-foreground font-normal">· {s.role}</span></span>
                        <span className="text-muted-foreground font-bold">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Waiting for a reply ({insights.messaging.unreplied_count})
                </p>
                {insights.messaging.unreplied_chats.length === 0 && insights.messaging.pending_list.length === 0 ? (
                  <Empty className="gap-1 py-4 md:py-4" data-testid="insights-unreplied-empty"><EmptyDescription>Inbox zero — everyone got a reply</EmptyDescription></Empty>
                ) : (
                  <ul className="grid gap-2">
                    {insights.messaging.unreplied_chats.slice(0, 5).map((c) => (
                      <li key={c.chat_id} data-testid="insights-unreplied" className="text-sm border border-border rounded-2xl px-3 py-2">
                        <p className="font-semibold text-foreground truncate">{c.last_sender_name} → {c.waiting_on}</p>
                        <p className="text-muted-foreground truncate">{c.last_message || '(media message)'}</p>
                        <p className="text-xs text-amber-600 font-semibold">waiting {c.hours_waiting}h</p>
                      </li>
                    ))}
                    {insights.messaging.pending_list.slice(0, 5).map((q) => (
                      <li key={q.id} data-testid="insights-unreplied" className="text-sm border border-border rounded-2xl px-3 py-2">
                        <p className="font-semibold text-foreground truncate">{q.trainee_name} — pending inquiry</p>
                        <p className="text-muted-foreground truncate">{q.message}</p>
                        <p className="text-xs text-amber-600 font-semibold">waiting {q.hours_waiting}h</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardPanel>
            </Card>
              </TabsPanel>

              <TabsPanel value="satisfaction" className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Satisfaction" value={`${insights.satisfaction.score}%`} icon={<Star className="w-4 h-4" />} testId="insights-csat" />
                <StatTile label="Response rate" value={`${insights.satisfaction.response_rate}%`} icon={<MessageSquare className="w-4 h-4" />} testId="insights-response-rate" />
                <StatTile label="Active farmers" value={`${insights.satisfaction.active_rate}%`} icon={<Users className="w-4 h-4" />} testId="insights-active-rate" />
              </div>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Inquiries answered vs pending</p>
                <ResponseDonut responded={insights.satisfaction.responded} pending={insights.messaging.pending_inquiries} />
                <div className="mt-1 flex items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#15803d]" /> Answered</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#f59e0b]" /> Pending</span>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Customer satisfaction</p>
                <p className="text-sm text-foreground" data-testid="insights-csat-detail">
                  {insights.satisfaction.score}% overall · {insights.satisfaction.response_rate}% inquiries answered · {insights.satisfaction.active_rate}% trainees active
                </p>
              </CardPanel>
            </Card>
              </TabsPanel>

              <TabsPanel value="revenue" className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Revenue / mo" value={`${insights.revenue.monthly_revenue_etb.toLocaleString()} ETB`} icon={<Banknote className="w-4 h-4" />} testId="insights-revenue" />
                <StatTile label="Active subs" value={insights.revenue.active_subscriptions} icon={<Users className="w-4 h-4" />} testId="insights-active-subs" />
                <StatTile label="Paid this mo" value={insights.revenue.paid_this_month} icon={<Activity className="w-4 h-4" />} testId="insights-paid-month" />
              </div>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Revenue trend (ETB)</p>
                {insights.revenue.monthly.length === 0 ? (
                  <Empty className="gap-1 py-4 md:py-4"><EmptyDescription>No payments recorded yet</EmptyDescription></Empty>
                ) : (
                  <RevenueTrend data={insights.revenue.monthly} />
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Revenue generated</p>
                <p className="text-sm text-foreground" data-testid="insights-revenue-detail">
                  {insights.revenue.monthly_revenue_etb.toLocaleString()} ETB/mo from {insights.revenue.active_subscriptions} active × {insights.revenue.price_etb.toLocaleString()} ETB · {insights.revenue.paid_this_month} paid this month
                </p>
                {insights.revenue.monthly.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {insights.revenue.monthly.map((m) => `${m.name}: ${m.revenue.toLocaleString()}`).join(' · ')}
                  </p>
                )}
              </CardPanel>
            </Card>
              </TabsPanel>

              <TabsPanel value="team" className="grid gap-3">
            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Messages vs inquiry replies per supervisor</p>
                {insights.employees.length === 0 ? (
                  <Empty className="gap-1 py-4 md:py-4"><EmptyDescription>No trainers yet</EmptyDescription></Empty>
                ) : (
                  <TeamActivity
                    data={insights.employees.slice(0, 8).map((e) => ({
                      name: e.display_name,
                      messages: e.messages_sent,
                      replies: e.inquiries_responded,
                    }))}
                  />
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardPanel className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Employee activity</p>
                {insights.employees.length === 0 ? (
                  <Empty className="gap-1 py-4 md:py-4"><EmptyDescription>No trainers yet</EmptyDescription></Empty>
                ) : (
                  <ul className="grid gap-2">
                    {insights.employees.slice(0, 8).map((e) => (
                      <li key={e.id} data-testid="insights-employee" className="flex items-center justify-between text-sm gap-2">
                        <span className="font-semibold text-foreground truncate">{e.display_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {e.trainees_assigned} trainees · {e.messages_sent} msgs · {e.inquiries_responded} replies
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardPanel>
            </Card>
              </TabsPanel>
            </Tabs>
          )}
        </section>
  );
}
