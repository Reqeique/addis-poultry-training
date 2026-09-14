import type { Metadata } from 'next';
import './globals.css'; // Global styles (coss ui design tokens)
import { AuthProvider } from '@/components/auth-provider';

import { Manrope, Geist_Mono } from 'next/font/google';

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Addis Poultry Training',
  description: 'A streamlined communication platform for poultry farmers and trainers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="am-ET" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans relative" suppressHydrationWarning>
        {/* Isolation wrapper per coss ui / Base UI: portaled overlays
            (dialogs, sheets, popovers) always paint above page content. */}
        <div className="isolate relative flex min-h-svh flex-col">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
