import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-skeleton rounded-md bg-[linear-gradient(90deg,var(--muted)_25%,color-mix(in_srgb,var(--muted)_55%,white)_50%,var(--muted)_75%)] bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
