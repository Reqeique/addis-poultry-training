'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DialogContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>;
}

function DialogPopup({
  className,
  children,
  showCloseButton = true,
}: {
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}) {
  const { open, setOpen } = React.useContext(DialogContext);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  if (!mounted || !open) return null;

  return createPortal(
    <div data-slot="dialog" className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        data-slot="dialog-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        data-slot="dialog-popup"
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-xl sm:rounded-xl',
          className
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

const DialogContent = DialogPopup;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 data-slot="dialog-title" className={cn('font-heading text-lg font-semibold', className)} {...props} />
  );
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function DialogPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="dialog-panel" className={cn('flex-1 overflow-y-auto px-5 py-2', className)} {...props} />
  );
}

function DialogFooter({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'bare' }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 p-5 pt-3 sm:flex-row sm:justify-end',
        variant === 'default' && 'border-t border-border bg-muted/40',
        className
      )}
      {...props}
    />
  );
}

export { Dialog, DialogPopup, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPanel, DialogFooter };
