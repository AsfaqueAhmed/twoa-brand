'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardList, LogIn } from 'lucide-react';
import type { Order } from '@/shared/domain/types';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import { getUserOrders } from '../application/getUserOrders';
import { getGuestOrders } from '../application/getGuestOrders';
import { cancelOrder } from '../application/cancelOrder';
import { trackOrder } from '../application/trackOrder';
import TrackLookupCard from './TrackLookupCard';
import OrderMainCard from './OrderMainCard';
import { OrderDetailsCard, HelpCard, OtherOrdersCard } from './OrderSidebar';

export default function OrderTrackingView() {
  const { user, authLoading, signIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const onRefresh = useCallback(async () => {
    setOrders(user ? await getUserOrders(user.uid) : await getGuestOrders());
  }, [user]);

  useEffect(() => {
    onRefresh().catch(() => setOrders([]));
  }, [onRefresh]);

  const onTrack = async (orderNumber: string, phone: string) => {
    setLookupError('');
    setLookupLoading(true);
    try {
      setSelectedOrder(await trackOrder(orderNumber, phone));
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Could not look up this order.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Prefer fresh list data for the selected order; default to the latest order.
  const activeOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : orders[0] || null;
  const viewerId = user ? user.uid : 'guest';

  const handleUserCancel = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(orderId, viewerId);
      await onRefresh();
      setSelectedOrder((o) => (o && o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel order.');
    }
  };

  const otherOrders = orders.filter((o) => o.id !== activeOrder?.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8 sm:px-6 lg:px-8" id="order-tracking-container">
      <nav className="flex items-center gap-2 text-sm text-[#717171]">
        <Link href="/" className="hover:text-black">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-black">Track Order</span>
      </nav>

      <h1 className="mt-3 text-2xl sm:text-4xl font-bold text-black">Track Your Order</h1>
      <p className="text-xs sm:text-sm text-[#717171] mt-1 mb-4 sm:mb-6">Enter your order details below to check the latest status.</p>

      {/* Optional sign-in nudge for guests — local tracking works fine without this */}
      {!authLoading && !user && (
        <div
          className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#EEEEEE] bg-[#FAF9F6] p-4"
          id="orders-guest-signin-nudge"
        >
          <p className="text-xs text-[#717171] leading-relaxed">
            You're tracking orders as a guest — they're saved on this device only. Sign in to sync your order history
            across devices instead.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="flex items-center justify-center space-x-1.5 border border-black bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors shrink-0"
            id="orders-guest-signin-btn"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In (Optional)</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-4 sm:gap-6 items-start">
        <div className="space-y-4 sm:space-y-6">
          <TrackLookupCard loading={lookupLoading} error={lookupError} onTrack={onTrack} />

          {activeOrder ? (
            <OrderMainCard order={activeOrder} canCancel={activeOrder.userId === viewerId} onCancel={handleUserCancel} />
          ) : (
            <div className="border border-dashed border-[#EEEEEE] bg-white p-8 sm:p-12 text-center flex flex-col items-center">
              <ClipboardList className="h-10 w-10 text-[#717171]" />
              <h2 className="mt-4 text-sm font-bold text-black">No order to show yet</h2>
              <p className="mt-2 text-xs text-[#717171] max-w-sm leading-relaxed">
                Enter your order number and phone number above to see your order status
                {user ? '.' : ', or place an order and it will appear here on this device.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24">
          {activeOrder && <OrderDetailsCard order={activeOrder} />}
          <HelpCard />
          <OtherOrdersCard orders={otherOrders} activeId={activeOrder?.id} onSelect={setSelectedOrder} />
        </div>
      </div>
    </div>
  );
}
