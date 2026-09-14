import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-background text-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
        success:
          'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-px text-[11px]',
        lg: 'px-3 py-1 text-[13px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  render?: React.ReactElement;
}

function Badge({ className, variant, size, render, ...props }: BadgeProps) {
  const classes = cn(badgeVariants({ variant, size }), className);
  if (render) {
    return React.cloneElement(render as React.ReactElement<any>, {
      className: cn((render.props as any)?.className, classes),
    });
  }
  return <span data-slot="badge" className={classes} {...props} />;
}

export { Badge, badgeVariants };
