'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAuth from '@/features/auth/presentation/RequireAuth';
import CheckoutForm from '@/features/checkout/presentation/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAuth>
          <CheckoutForm />
        </RequireAuth>
      </main>
    </div>
  );
}
