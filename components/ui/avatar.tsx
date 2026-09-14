import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function Avatar({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
} & Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) {
  return (
    <Image
      data-slot="avatar-image"
      src={src}
      alt={alt}
      fill
      className="object-cover"
      unoptimized
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn('flex size-full items-center justify-center uppercase', className)}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
