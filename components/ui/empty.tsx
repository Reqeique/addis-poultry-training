import * as React from 'react';
import { cn } from '@/lib/utils';

function Empty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center',
        className
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 data-slot="empty-title" className={cn('font-heading text-base font-semibold', className)} {...props} />
  );
}

function EmptyDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="empty-description" className={cn('max-w-sm text-sm text-muted-foreground', className)} {...props} />
  );
}

export { Empty, EmptyTitle, EmptyDescription };
