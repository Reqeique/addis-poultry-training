import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-xl border px-4 py-3 text-sm shadow-[0_1px_0_0_var(--border)]', {
  variants: {
    variant: {
      default: 'border-border bg-card text-foreground',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
      success: 'border-success/30 bg-success/10 text-success',
      warning: 'border-warning/30 bg-warning/10 text-warning',
      info: 'border-info/30 bg-info/10 text-info',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 data-slot="alert-title" className={cn('font-semibold', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-description" className={cn('mt-0.5 text-[13px] opacity-90', className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
