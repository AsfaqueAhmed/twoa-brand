import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
