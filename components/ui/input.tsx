import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm font-medium text-foreground',
        'shadow-[0_1px_0_0_var(--border)] outline-none transition-colors',
        'placeholder:text-muted-foreground placeholder:font-normal',
        'focus:border-ring focus:ring-2 focus:ring-ring/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Input };
