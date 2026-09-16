'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardPanel } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatTile({ label, value, icon, testId }: { label: string; value: number | string | undefined; icon: React.ReactNode; testId?: string }) {
  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <CardPanel className="flex min-w-0 flex-col gap-2 p-3 sm:p-5">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Avatar className="size-7 shrink-0 bg-primary/15 sm:size-8">
            <AvatarFallback className="bg-primary/15 text-primary-foreground">{icon}</AvatarFallback>
          </Avatar>
          <p className="text-muted-foreground text-[11px] sm:text-xs font-bold uppercase tracking-wide truncate min-w-0">{label}</p>
        </div>
        {value === undefined ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <p className="text-xl sm:text-3xl font-bold text-foreground break-words min-w-0" {...(testId ? { 'data-testid': testId } : {})}>{value}</p>
        )}
      </CardPanel>
    </Card>
  );
}
