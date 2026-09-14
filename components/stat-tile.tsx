'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function StatTile({ label, value, icon, testId }: { label: string; value: number | string | undefined; icon: React.ReactNode; testId?: string }) {
  return (
    <div className="min-w-0 flex flex-col gap-2 rounded-3xl p-4 sm:p-5 bg-card shadow-sm border border-border">
      <div className="flex items-center gap-2">
        <div className="size-8 shrink-0 rounded-full bg-success/15 flex items-center justify-center text-primary-foreground">{icon}</div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide truncate">{label}</p>
      </div>
      {value === undefined ? (
        <Skeleton className="h-9 w-14" />
      ) : (
        <p className="text-2xl sm:text-3xl font-bold text-foreground break-words" {...(testId ? { 'data-testid': testId } : {})}>{value}</p>
      )}
    </div>
  );
}
