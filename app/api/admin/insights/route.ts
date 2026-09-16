import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_PRICE_ETB = 1000;
const MESSAGE_LIMIT = 3000;
const UNREPLIED_AFTER_HOURS = 1;

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—';
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) {
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export async function GET() {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const admin = createAdminClient();

  const [profilesRes, messagesRes, participantsRes, inquiriesRes] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, display_name, phone_number, role, is_active, assigned_trainer_id, created_at, updated_at, last_payment_at, subscription_expires_at',
      )
      .limit(2000),
    admin
      .from('messages')
      .select('id, chat_id, sender_id, text, created_at')
      .order('created_at', { ascending: true })
      .limit(MESSAGE_LIMIT),
    admin.from('chat_participants').select('chat_id, user_id').limit(5000),
    admin
      .from('inquiries')
      .select('id, trainee_id, trainer_id, trainee_name, message, status, created_at, responded_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 400 });
  }

  const profiles = (profilesRes.data ?? []) as {
    id: string;
    display_name: string;
    phone_number: string;
    role: string;
    is_active: boolean;
    assigned_trainer_id: string | null;
    created_at: string;
    updated_at: string;
    last_payment_at: string | null;
    subscription_expires_at: string | null;
  }[];

  const messages = ((messagesRes.data ?? []) as {
    id: string;
    chat_id: string;
    sender_id: string;
    text: string | null;
    created_at: string;
  }[]).filter((m) => m.created_at && m.sender_id && m.chat_id);

  const participants = (participantsRes.data ?? []) as { chat_id: string; user_id: string }[];
  const inquiries = (inquiriesRes.data ?? []) as {
    id: string;
    trainee_id: string;
    trainer_id: string | null;
    trainee_name: string;
    message: string;
    status: string;
    created_at: string;
    responded_at: string | null;
  }[];

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // ---- Messaging: who sends ----
  const messagesByRole: Record<string, number> = { trainer: 0, trainee: 0, admin: 0 };
  const countBySender = new Map<string, number>();
  for (const m of messages) {
    countBySender.set(m.sender_id, (countBySender.get(m.sender_id) ?? 0) + 1);
    const role = profileById.get(m.sender_id)?.role ?? 'unknown';
    if (role in messagesByRole) messagesByRole[role] += 1;
  }
  const topSenders = [...countBySender.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const p = profileById.get(id);
      return {
        id,
        display_name: p?.display_name ?? 'Unknown',
        role: p?.role ?? 'unknown',
        phone_number: p?.phone_number ?? '',
        count,
      };
    });

  // ---- Reply time (chat) + unreplied (nobody replied to the last message) ----
  const byChat = new Map<string, typeof messages>();
  for (const m of messages) {
    const list = byChat.get(m.chat_id) ?? [];
    list.push(m);
    byChat.set(m.chat_id, list);
  }

  const replyGaps: number[] = [];
  const participantsByChat = new Map<string, string[]>();
  for (const p of participants) {
    const list = participantsByChat.get(p.chat_id) ?? [];
    list.push(p.user_id);
    participantsByChat.set(p.chat_id, list);
  }

  const now = Date.now();
  const unrepliedChats: {
    chat_id: string;
    last_sender_name: string;
    last_sender_role: string;
    waiting_on: string;
    last_message: string;
    last_message_time: string;
    hours_waiting: number;
  }[] = [];

  for (const [chatId, list] of byChat) {
    list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    for (let i = 1; i < list.length; i++) {
      if (list[i].sender_id !== list[i - 1].sender_id) {
        const gap =
          (+new Date(list[i].created_at) - +new Date(list[i - 1].created_at)) / 1000;
        if (gap >= 0 && gap < 30 * 24 * 3600) replyGaps.push(gap);
      }
    }
    const last = list[list.length - 1];
    const hoursWaiting = (now - +new Date(last.created_at)) / 3600000;
    if (hoursWaiting >= UNREPLIED_AFTER_HOURS) {
      const memberIds = participantsByChat.get(chatId) ?? [];
      const others = memberIds.filter((id) => id !== last.sender_id);
      const otherName =
        others.length > 0
          ? others.map((id) => profileById.get(id)?.display_name ?? 'Unknown').join(', ')
          : 'Unknown';
      const sender = profileById.get(last.sender_id);
      unrepliedChats.push({
        chat_id: chatId,
        last_sender_name: sender?.display_name ?? 'Unknown',
        last_sender_role: sender?.role ?? 'unknown',
        waiting_on: otherName,
        last_message: (last.text ?? '').slice(0, 120),
        last_message_time: last.created_at,
        hours_waiting: Math.round(hoursWaiting * 10) / 10,
      });
    }
  }

  unrepliedChats.sort((a, b) => b.hours_waiting - a.hours_waiting);
  const avgReplySecondsChat =
    replyGaps.length > 0 ? replyGaps.reduce((s, v) => s + v, 0) / replyGaps.length : null;

  // ---- Inquiries: reply time + satisfaction proxy ----
  const responded = inquiries.filter((q) => q.status === 'responded' || q.responded_at);
  const inquiryGaps: number[] = [];
  for (const q of responded) {
    if (q.responded_at && q.created_at) {
      const gap = (+new Date(q.responded_at) - +new Date(q.created_at)) / 1000;
      if (gap >= 0 && gap < 30 * 24 * 3600) inquiryGaps.push(gap);
    }
  }
  const avgInquirySeconds =
    inquiryGaps.length > 0 ? inquiryGaps.reduce((s, v) => s + v, 0) / inquiryGaps.length : null;

  const totalInquiries = inquiries.length;
  const responseRate = totalInquiries > 0 ? Math.round((responded.length / totalInquiries) * 100) : 0;

  const trainees = profiles.filter((p) => p.role === 'trainee');
  const activeTrainees = trainees.filter((p) => p.is_active);
  const activeRate =
    trainees.length > 0 ? Math.round((activeTrainees.length / trainees.length) * 100) : 0;
  // Satisfaction proxy: blend of inquiry response rate + trainee active rate.
  const satisfactionScore = Math.round((responseRate + activeRate) / 2);

  // ---- Revenue: 1,000 ETB per active subscription ----
  // Returns the trailing 12 months (zero-filled) so the CEO can switch
  // between a 6-month view and a Yearly view client-side.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const paidThisMonth = trainees.filter(
    (t) => t.last_payment_at && +new Date(t.last_payment_at) >= +monthStart,
  );
  const monthly: { name: string; revenue: number; payments: number }[] = [];
  const byMonth = new Map<string, number>();
  for (const t of trainees) {
    if (!t.last_payment_at) continue;
    const ym = t.last_payment_at.slice(0, 7);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + 1);
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nowD = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = byMonth.get(ym) ?? 0;
    monthly.push({
      name: monthNames[d.getMonth()] ?? ym,
      revenue: count * SUBSCRIPTION_PRICE_ETB,
      payments: count,
    });
  }

  // ---- Employee activity (trainers) ----
  const trainers = profiles.filter((p) => p.role === 'trainer');
  const traineesByTrainer = new Map<string, number>();
  for (const t of trainees) {
    if (t.assigned_trainer_id) {
      traineesByTrainer.set(t.assigned_trainer_id, (traineesByTrainer.get(t.assigned_trainer_id) ?? 0) + 1);
    }
  }
  const inquiriesByTrainer = new Map<string, number>();
  for (const q of responded) {
    if (q.trainer_id) {
      inquiriesByTrainer.set(q.trainer_id, (inquiriesByTrainer.get(q.trainer_id) ?? 0) + 1);
    }
  }
  const employees = trainers
    .map((t) => ({
      id: t.id,
      display_name: t.display_name,
      phone_number: t.phone_number,
      is_active: t.is_active,
      last_active: t.updated_at,
      trainees_assigned: traineesByTrainer.get(t.id) ?? 0,
      messages_sent: countBySender.get(t.id) ?? 0,
      inquiries_responded: inquiriesByTrainer.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.messages_sent + b.inquiries_responded - (a.messages_sent + a.inquiries_responded))
    .slice(0, 20);

  return NextResponse.json({
    messaging: {
      total_messages: messages.length,
      messages_by_role: messagesByRole,
      top_senders: topSenders,
      unreplied_chats: unrepliedChats.slice(0, 20),
      unreplied_count: unrepliedChats.length,
      pending_inquiries: totalInquiries - responded.length,
      responded_inquiries: responded.length,
      total_inquiries: totalInquiries,
      pending_list: inquiries
        .filter((q) => q.status !== 'responded' && !q.responded_at)
        .slice(0, 20)
        .map((q) => ({
          id: q.id,
          trainee_name: q.trainee_name,
          message: q.message.slice(0, 120),
          created_at: q.created_at,
          hours_waiting: Math.round(((now - +new Date(q.created_at)) / 3600000) * 10) / 10,
        })),
    },
    reply_time: {
      avg_reply_seconds_chat: avgReplySecondsChat,
      avg_reply_display_chat: formatDuration(avgReplySecondsChat),
      replies_counted: replyGaps.length,
      avg_inquiry_seconds: avgInquirySeconds,
      avg_inquiry_display: formatDuration(avgInquirySeconds),
      inquiries_counted: inquiryGaps.length,
    },
    satisfaction: {
      score: satisfactionScore,
      response_rate: responseRate,
      active_rate: activeRate,
      total_inquiries: totalInquiries,
      responded: responded.length,
      active_trainees: activeTrainees.length,
      total_trainees: trainees.length,
    },
    revenue: {
      price_etb: SUBSCRIPTION_PRICE_ETB,
      active_subscriptions: activeTrainees.length,
      monthly_revenue_etb: activeTrainees.length * SUBSCRIPTION_PRICE_ETB,
      paid_this_month: paidThisMonth.length,
      paid_this_month_revenue_etb: paidThisMonth.length * SUBSCRIPTION_PRICE_ETB,
      monthly,
    },
    employees,
  });
}
