import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';
import { CartProvider } from '@/features/cart/presentation/CartProvider';
import { ProductNavigationProvider } from '@/features/product/presentation/ProductNavigationProvider';
import { CustomTeeProvider } from '@/features/customTee/presentation/CustomTeeProvider';
import MetaPixelScript from '@/shared/presentation/MetaPixelScript';

export const metadata: Metadata = {
  title: '2A',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <MetaPixelScript />
        <AuthProvider>
          <CartProvider>
            <ProductNavigationProvider>
              <CustomTeeProvider>
                {children}
              </CustomTeeProvider>
            </ProductNavigationProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
