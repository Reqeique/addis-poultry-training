import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-[96px] w-full rounded-[var(--radius)] border border-input bg-background p-3 text-sm font-medium text-foreground',
        'shadow-[0_1px_0_0_var(--border)] outline-none transition-colors resize-y',
        'placeholder:text-muted-foreground placeholder:font-normal',
        'focus:border-ring focus:ring-2 focus:ring-ring/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
