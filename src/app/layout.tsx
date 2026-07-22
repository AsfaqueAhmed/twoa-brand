import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';
import { CartProvider } from '@/features/cart/presentation/CartProvider';
import CartDrawer from '@/features/cart/presentation/CartDrawer';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
