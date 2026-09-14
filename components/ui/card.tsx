import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground',
        'shadow-[0_1px_0_0_var(--border)]',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 p-5 pb-3', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('font-heading text-base font-semibold leading-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-action"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  );
}

function CardPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-panel" className={cn('p-5 pt-0', className)} {...props} />
  );
}

const CardContent = CardPanel;

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-2 border-t border-border bg-muted/40 px-5 py-3 text-sm', className)}
      {...props}
    />
  );
}

/** Framed layout: header with optional action + bordered content. */
function CardFrame({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-frame" className={cn('flex flex-col gap-3', className)} {...props} />;
}

function CardFrameHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-frame-header"
      className={cn('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-1', className)}
      {...props}
    />
  );
}

function CardFrameTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="card-frame-title"
      className={cn('font-heading text-lg font-bold tracking-tight', className)}
      {...props}
    />
  );
}

function CardFrameDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="card-frame-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function CardFrameAction({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-frame-action"
      className={cn('col-start-2 row-span-2 self-center justify-self-end', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardPanel,
  CardContent,
  CardFooter,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardFrameDescription,
  CardFrameAction,
};
