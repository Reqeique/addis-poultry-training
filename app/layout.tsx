import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/auth-provider';

import { Manrope } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Poultry Training Chat App',
  description: 'A streamlined communication platform for poultry farmers and trainers.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="am-ET" className={`${manrope.variable}`}>
      <body className="font-sans" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
