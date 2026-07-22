'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import OrderTrackingView from '@/features/orders/presentation/OrderTrackingView';

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <OrderTrackingView />
      </main>
    </div>
  );
}
