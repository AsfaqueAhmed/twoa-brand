'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShoppingBag, Search } from 'lucide-react';
import type { Order, OrderStatus } from '@/shared/domain/types';
import { listAllOrders } from '../application/listAllOrders';
import { updateOrderStatusAsAdmin } from '../application/updateOrderStatusAsAdmin';

const getStatusStyle = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'confirmed':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'out_for_delivery':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'delivered':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-red-50 text-red-800 border-red-200';
  }
};

export default function AdminOrderManager() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');

  const refreshOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      setAllOrders(await listAllOrders());
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const handleAdminUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatusAsAdmin(orderId, newStatus);
      await refreshOrders();
    } catch (err) {
      console.error('Error updating order status: ', err);
      alert('Failed to update status.');
    }
  };

  const filteredOrders = allOrders.filter((o) => {
    const matchesSearch =
      o.userName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.userEmail.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.phone.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Filtering and Sorting controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute top-3 left-3.5 h-4 w-4 text-[#717171]" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email or ID..."
            value={orderSearchQuery}
            onChange={(e) => setOrderSearchQuery(e.target.value)}
            className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
            id="admin-order-search"
          />
        </div>

        {/* Status Tabs selector */}
        <div className="flex bg-[#F5F5F5] p-1 border border-[#EEEEEE] rounded-none justify-between col-span-1 md:col-span-2">
          {(['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setOrderStatusFilter(st)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none ${
                orderStatusFilter === st ? 'bg-white text-black shadow-xs' : 'text-[#717171] hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders detail list */}
      {ordersLoading ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#EEEEEE]">
          <RefreshCw className="h-6 w-6 text-black animate-spin mb-4" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#717171]">Synchronizing orders list...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-none border border-[#EEEEEE] p-12 text-center bg-white">
          <ShoppingBag className="mx-auto h-8 w-8 text-[#717171] mb-3" />
          <h3 className="text-sm font-bold uppercase text-black">No Customer Orders Available</h3>
          <p className="mt-2 text-xs text-[#717171] leading-relaxed max-w-xs mx-auto">
            No customer has placed orders matching this filter, or the system orders database is empty.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white border border-[#EEEEEE] rounded-none p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6"
              id={`admin-order-row-${ord.id}`}
            >
              {/* Order Main Details & Customer Data */}
              <div className="space-y-4 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-black uppercase tracking-tight">Order #{ord.id}</span>
                  <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border ${getStatusStyle(ord.status)}`}>
                    {ord.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-[#919191] font-mono">{new Date(ord.createdAt).toLocaleString()}</span>
                </div>

                {/* Customer Identity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs leading-relaxed">
                  <div>
                    <span className="text-[#717171] block font-medium">Customer Information:</span>
                    <p className="text-black font-bold uppercase tracking-wide mt-0.5">{ord.userName}</p>
                    <p className="text-[#717171] font-mono">{ord.userEmail}</p>
                    <p className="text-[#111111] font-mono font-bold mt-0.5">Phone: {ord.phone}</p>
                  </div>
                  <div>
                    <span className="text-[#717171] block font-medium">Delivery Address (Cash on Delivery):</span>
                    <p className="text-black font-semibold mt-0.5 leading-relaxed">{ord.address}</p>
                  </div>
                </div>

                {/* Ordered Items summary breakdown */}
                <div className="border-t border-[#F5F5F5] pt-4.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#717171]">Order Details:</span>
                  <div className="mt-2 divide-y divide-[#F5F5F5] bg-[#FAF9F6] border border-[#EEEEEE] p-4 space-y-1 max-h-[140px] overflow-y-auto">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5 first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-7 w-7 object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-black truncate block max-w-[200px] uppercase tracking-wide">
                              {item.name} <span className="text-[#717171] font-normal">× {item.quantity}</span>
                            </span>

                            {/* Badges */}
                            <div className="flex gap-1 mt-0.5">
                              {item.selectedVariant && (
                                <span className="inline-flex items-center gap-1 text-[8px] font-bold text-black uppercase font-mono tracking-wider bg-white px-1 border border-[#EEEEEE]">
                                  {item.selectedVariant.name}
                                </span>
                              )}
                              {item.selectedSize && (
                                <span className="text-[8px] font-bold text-black uppercase font-mono tracking-wider bg-white px-1 border border-[#EEEEEE]">
                                  Size: {item.selectedSize}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-black">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Total and Shipping controls */}
              <div className="flex flex-col md:items-end justify-between self-stretch shrink-0 gap-4">
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#717171]">Total Delivery Amount</span>
                  <p className="text-2xl font-bold text-black font-mono mt-1">${ord.totalAmount.toFixed(2)}</p>
                  <span className="inline-block mt-1 bg-black text-white px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold">
                    Pay on Delivery
                  </span>
                </div>

                {/* Merchant actions dropdown status updates */}
                <div className="border border-[#EEEEEE] bg-[#FAF9F6] p-3.5 space-y-2">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-black">Update Shipping Status:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]).map((statusVal) => {
                      const isCurrent = ord.status === statusVal;
                      return (
                        <button
                          key={statusVal}
                          onClick={() => handleAdminUpdateOrderStatus(ord.id, statusVal)}
                          className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all border ${
                            isCurrent
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-[#717171] border-[#EEEEEE] hover:border-black hover:text-black'
                          }`}
                        >
                          {statusVal.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
