'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

function Tabs({
  value,
  onValueChange,
  className,
  ...props
}: {
  value: string;
  onValueChange: (v: string) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="tabs" data-value={value} className={cn('flex flex-col gap-3', className)} {...props}>
      {React.Children.map(props.children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, { value, onValueChange })
          : child
      )}
    </div>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn('inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-muted p-1', className)}
      {...props}
    />
  );
}

function TabsTrigger({
  value,
  tabValue,
  onValueChange,
  className,
  ...props
}: {
  value?: string;
  tabValue: string;
  onValueChange?: (v: string) => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const active = value === tabValue;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? 'active' : 'inactive'}
      onClick={() => onValueChange?.(tabValue)}
      className={cn(
        'inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors outline-none',
        active ? 'bg-card text-foreground shadow-[0_1px_0_0_var(--border)]' : 'text-muted-foreground hover:text-foreground',
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger };
