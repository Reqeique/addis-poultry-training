import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_1px_0_0_var(--border)] hover:opacity-90 active:opacity-80',
        outline:
          'border border-input bg-background text-foreground shadow-[0_1px_0_0_var(--border)] hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[0_1px_0_0_var(--border)] hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_1px_0_0_var(--border)] hover:opacity-90',
        'destructive-outline':
          'border border-input bg-background text-destructive shadow-[0_1px_0_0_var(--border)] hover:bg-destructive/10',
      },
      size: {
        default: 'h-9 px-4 py-2',
        xs: 'h-7 rounded-md px-2.5 text-xs',
        sm: 'h-8 rounded-md px-3 text-[13px]',
        lg: 'h-11 rounded-xl px-6 text-[15px]',
        xl: 'h-13 rounded-xl px-8 py-4 text-base h-[52px]',
        icon: 'size-9',
        'icon-xs': 'size-7 [&_svg]:size-3.5',
        'icon-sm': 'size-8 [&_svg]:size-4',
        'icon-lg': 'size-11 [&_svg]:size-5',
        'icon-xl': 'size-13 [&_svg]:size-6 size-[52px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Render as a different element, e.g. <Link>. Mirrors coss `render` prop. */
  render?: React.ReactElement;
}

function Button({
  className,
  variant,
  size,
  loading = false,
  render,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const content = (
    <>
      {loading && (
        <span data-slot="button-loading-indicator" className="inline-flex">
          <Spinner className="size-4" />
        </span>
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {children}
      </span>
      {loading && <span className="sr-only">Loading</span>}
    </>
  );

  if (render) {
    return React.cloneElement(render as React.ReactElement<any>, {
      className: cn((render.props as any)?.className, classes),
      'aria-disabled': loading || disabled || undefined,
      children: content,
    });
  }

  return (
    <button
      data-slot="button"
      data-loading={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}

export { Button, buttonVariants };
