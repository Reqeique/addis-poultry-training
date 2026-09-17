import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles (coss ui design tokens)
import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';

import { Geist_Mono, Inter } from 'next/font/google';
import { cn } from "@/lib/utils";

const interHeading = Inter({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: 'My Chicken Addis',
  description: 'A streamlined communication platform for poultry farmers and supervisors.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'My Chicken Addis',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0284c7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="am-ET" className={cn("font-sans", inter.variable, interHeading.variable, geistMono.variable)}>
      <body className="font-sans relative" suppressHydrationWarning>
        {/* Isolation wrapper per coss ui / Base UI: portaled overlays
            (dialogs, sheets, popovers) always paint above page content. */}
        <div className="isolate relative flex min-h-svh flex-col">
          <ToastProvider position="top-center">
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
