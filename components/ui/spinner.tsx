import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span data-slot="spinner" role="status" aria-label="Loading" className={cn('inline-flex', className)} {...props}>
      <Loader2 className="size-full animate-spin" aria-hidden="true" />
    </span>
  );
}

export { Spinner };
