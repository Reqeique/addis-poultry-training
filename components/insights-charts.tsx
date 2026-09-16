'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const NAVY = '#082f49';
const SKY = '#0284c7';
const TEAL = '#44bae7';
const AMBER = '#f59e0b';
const SLATE = '#cbd5e1';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--card-foreground)',
  fontSize: 12,
} as const;

export function RoleBars({ data }: { data: { name: string; value: number }[] }) {
  const colors = [NAVY, SKY, TEAL];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
        <YAxis width={28} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrend({ data }: { data: { name: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()} ETB`, 'Revenue']} />
        <Bar dataKey="revenue" fill={SKY} radius={[8, 8, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ResponseDonut({ responded, pending }: { responded: number; pending: number }) {
  const data = [
    { name: 'Answered', value: responded },
    { name: 'Pending', value: pending },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={3} isAnimationActive={false}>
          <Cell fill={SKY} />
          <Cell fill={AMBER} />
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TeamActivity({
  data,
}: {
  data: { name: string; messages: number; replies: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={84}
          tickFormatter={(v: string) => (v.length > 11 ? `${v.slice(0, 11)}…` : v)}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="messages" stackId="a" fill={NAVY} radius={[0, 0, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="replies" stackId="a" fill={TEAL} radius={[0, 6, 6, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { SLATE };
