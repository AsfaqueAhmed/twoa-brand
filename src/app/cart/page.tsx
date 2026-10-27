'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import CartPage from '@/features/cart/presentation/CartPage';

export default function CartRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CartPage />
      </main>
    </div>
  );
}
