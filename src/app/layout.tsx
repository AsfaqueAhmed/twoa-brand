import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
