'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, ShoppingBag, Search, Plus } from 'lucide-react';
import type { Order, OrderStatus, Product } from '@/shared/domain/types';
import { listAllOrders } from '../application/listAllOrders';
import { updateOrderStatusAsAdmin } from '../application/updateOrderStatusAsAdmin';
import { fetchAllProducts } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { toggleSelected, shortOrderId, pruneSelection } from '../domain/orderView';
import BulkToolbar from './BulkToolbar';
import AdminOrderCard from './AdminOrderCard';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';

export default function AdminOrderManager() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAllProducts()
      .then((p) => {
        if (!cancelled) setProducts(p);
      })
      .catch((err) => console.error('Error loading products for order thumbnails: ', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const refreshOrders = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setOrdersLoading(true);
    try {
      setAllOrders(await listAllOrders());
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const handleAdminUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatusAsAdmin(orderId, newStatus);
    } catch (err) {
      console.error('Error updating order status: ', err);
      alert('Failed to update status.');
      return;
    }
    try {
      await refreshOrders({ silent: true });
    } catch (err) {
      console.error('Error refreshing orders after status update: ', err);
    }
  };

  const filteredOrders = useMemo(() => allOrders.filter((o) => {
    const matchesSearch =
      o.userName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.userEmail.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.phone.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  }), [allOrders, orderSearchQuery, orderStatusFilter]);

  const visibleIds = useMemo(() => filteredOrders.map((o) => o.id), [filteredOrders]);
  useEffect(() => {
    setSelected((prev) => pruneSelection(prev, visibleIds));
  }, [visibleIds]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedSet.has(o.id));

  const handleToggleAll = () => setSelected(allSelected ? [] : visibleIds);

  const handleBulkApply = async (status: OrderStatus) => {
    if (bulkBusy) return;
    if (status === 'cancelled' && !window.confirm(`Cancel ${selected.length} selected order(s)?`)) return;
    setBulkBusy(true);
    const failedIds: string[] = [];
    const ids = [...selected];
    try {
      for (const id of ids) {
        try {
          await updateOrderStatusAsAdmin(id, status);
        } catch (err) {
          console.error('Error updating order status: ', err);
          failedIds.push(id);
        }
      }
      try {
        await refreshOrders({ silent: true });
      } catch (err) {
        console.error('Error refreshing orders after bulk update: ', err);
      }
    } finally {
      setBulkBusy(false);
    }
    if (failedIds.length > 0) {
      setSelected(failedIds);
      alert(`Updated ${ids.length - failedIds.length} of ${ids.length} orders. Failed: ${failedIds.map(shortOrderId).join(', ')}`);
    } else {
      setSelected([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminPageHeader
        title="All Orders"
        subtitle="Review orders and update their status."
        actions={
          <Link
            href="/admin/orders/new"
            id="admin-create-order-btn"
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-[#222222]"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        }
      />

      {/* Header Filtering and Sorting controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF9F6] border border-[#EEEEEE] rounded-lg p-5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute top-3 left-3.5 h-4 w-4 text-[#717171]" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email or ID..."
            value={orderSearchQuery}
            onChange={(e) => setOrderSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
            id="admin-order-search"
          />
        </div>

        {/* Status Tabs selector */}
        <div className="flex bg-[#F5F5F5] p-1 border border-[#EEEEEE] rounded-lg justify-between col-span-1 md:col-span-2">
          {(['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setOrderStatusFilter(st)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${
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
        <div className="rounded-lg border border-[#EEEEEE] p-12 text-center bg-white">
          <ShoppingBag className="mx-auto h-8 w-8 text-[#717171] mb-3" />
          <h3 className="text-sm font-bold uppercase text-black">No Customer Orders Available</h3>
          <p className="mt-2 text-xs text-[#717171] leading-relaxed max-w-xs mx-auto">
            No customer has placed orders matching this filter, or the system orders database is empty.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <BulkToolbar
            total={filteredOrders.length}
            selectedCount={selected.length}
            allSelected={allSelected}
            onToggleAll={handleToggleAll}
            onApply={handleBulkApply}
            onClear={() => setSelected([])}
            busy={bulkBusy}
          />
          {filteredOrders.map((ord) => (
            <AdminOrderCard
              key={ord.id}
              order={ord}
              productsById={productsById}
              selected={selectedSet.has(ord.id)}
              disabled={bulkBusy}
              onToggleSelected={() => setSelected((prev) => toggleSelected(prev, ord.id))}
              onStatusChange={(s) => handleAdminUpdateOrderStatus(ord.id, s)} />
          ))}
        </div>
      )}
    </div>
  );
}
