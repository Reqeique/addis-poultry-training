'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardPanel } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatTile({ label, value, icon, testId }: { label: string; value: number | string | undefined; icon: React.ReactNode; testId?: string }) {
  return (
    <Card className="min-w-0">
      <CardPanel className="flex flex-col gap-2 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Avatar className="size-8 bg-success/15">
            <AvatarFallback className="bg-success/15 text-primary-foreground">{icon}</AvatarFallback>
          </Avatar>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide truncate">{label}</p>
        </div>
        {value === undefined ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <p className="text-2xl sm:text-3xl font-bold text-foreground break-words" {...(testId ? { 'data-testid': testId } : {})}>{value}</p>
        )}
      </CardPanel>
    </Card>
  );
}
