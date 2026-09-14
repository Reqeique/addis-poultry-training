import * as React from 'react';
import { cn } from '@/lib/utils';

function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="field" className={cn('flex w-full flex-col gap-1.5', className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="field-label"
      className={cn('text-[13px] font-semibold text-foreground', className)}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="field-description" className={cn('text-xs text-muted-foreground', className)} {...props} />
  );
}

function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="field-error" className={cn('text-xs font-medium text-destructive', className)} {...props} />
  );
}

export { Field, FieldLabel, FieldDescription, FieldError };
