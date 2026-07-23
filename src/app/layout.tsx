import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';
import { CartProvider } from '@/features/cart/presentation/CartProvider';
import CartDrawer from '@/features/cart/presentation/CartDrawer';
import { ProductModalProvider } from '@/features/product/presentation/ProductModalProvider';

export const metadata: Metadata = {
  title: '2A',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>
          <CartProvider>
            <ProductModalProvider>
              {children}
              <CartDrawer />
            </ProductModalProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
