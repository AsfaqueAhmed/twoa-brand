'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, Truck, PackageCheck, AlertCircle, RefreshCw, ClipboardList, MapPin, Phone, User, ShoppingCart } from 'lucide-react';
import type { Order, OrderStatus } from '@/shared/domain/types';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import { getUserOrders } from '../application/getUserOrders';
import { cancelOrder } from '../application/cancelOrder';
import { updateOrderStatus } from '../application/updateOrderStatus';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function OrderTrackingView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      setOrders(await getUserOrders(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const onUpdateStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    await onRefresh();
  };

  const onCancelOrder = async (orderId: string) => {
    await cancelOrder(orderId);
    await onRefresh();
  };

  // Sync selected order changes if list refreshes
  const activeOrder = selectedOrder ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder : null;

  const steps: { status: OrderStatus; label: string; desc: string; icon: any }[] = [
    {
      status: 'pending',
      label: 'Ordered',
      desc: 'Order received, awaiting confirmation.',
      icon: Clock,
    },
    {
      status: 'confirmed',
      label: 'Confirmed',
      desc: 'Verified and packing your items.',
      icon: CheckCircle2,
    },
    {
      status: 'out_for_delivery',
      label: 'Shipped',
      desc: 'Out for delivery with our courier.',
      icon: Truck,
    },
    {
      status: 'delivered',
      label: 'Delivered',
      desc: 'Delivered successfully! Paid on delivery.',
      icon: PackageCheck,
    },
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'cancelled') return -1;
    return steps.findIndex((step) => step.status === status);
  };

  const currentStepIndex = activeOrder ? getStepIndex(activeOrder.status) : -1;

  const handleSimulateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setSimulating(nextStatus);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update order status.');
    } finally {
      setSimulating(null);
    }
  };

  const handleUserCancel = async (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await onCancelOrder(orderId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to cancel order.');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="order-tracking-container">
      <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-black">Your Orders & Tracking</h2>
          <p className="text-xs text-[#717171] mt-2">
            Review delivery status or simulate real-time shipping updates.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 rounded-none border border-black bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#F5F5F5] transition-colors"
          id="refresh-orders-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Order list */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2">Order History</h3>

          {loading && orders.length === 0 ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-black" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-none border border-dashed border-[#EEEEEE] p-8 text-center bg-white">
              <ClipboardList className="mx-auto h-8 w-8 text-[#717171]" />
              <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-black">No Orders Found</h4>
              <p className="mt-2 text-xs text-[#717171] leading-relaxed">
                You haven't placed any orders yet. Add items to your cart and check out!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isSelected = activeOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`cursor-pointer rounded-none border p-4 transition-all duration-200 bg-white hover:border-[#717171] ${
                      isSelected ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE]'
                    }`}
                    id={`order-row-${order.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-[#717171] block uppercase">
                          ID: #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-black uppercase mt-1 block">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          order.status === 'delivered'
                            ? 'bg-black text-white border border-black'
                            : order.status === 'cancelled'
                              ? 'bg-[#F5F5F5] text-[#717171] border border-[#EEEEEE]'
                              : 'bg-[#F9F9F9] text-black border border-black'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs border-t border-[#EEEEEE] pt-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#717171]">Grand Total</span>
                        <span className="block font-bold text-black font-mono mt-0.5">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#717171] font-mono">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Active order tracking timeline details */}
        <div className="lg:col-span-8">
          {activeOrder ? (
            <div className="space-y-6" id="active-tracking-details">
              {/* Order Information Container */}
              <div className="rounded-none border border-[#EEEEEE] bg-white p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EEEEEE] pb-5">
                  <div>
                    <span className="text-[10px] font-mono text-black font-bold block uppercase tracking-wider">
                      Order ID: #{activeOrder.id.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-black uppercase tracking-[0.2em] mt-2">
                      Tracking Progress
                    </h3>
                  </div>
                  <div className="mt-2 sm:mt-0 text-left sm:text-right">
                    <span className="text-[10px] text-[#717171] uppercase tracking-wider block">Placed on</span>
                    <span className="text-xs font-bold text-black block mt-0.5 font-mono">
                      {new Date(activeOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Cancelled State Hero Banner */}
                {activeOrder.status === 'cancelled' ? (
                  <div className="my-6 flex items-start space-x-3 rounded-none border border-black bg-[#FDFDFD] p-5 text-black">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-black" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">This Order was Cancelled</h4>
                      <p className="text-xs mt-2 text-[#717171] leading-relaxed">
                        This purchase request has been flagged as cancelled and no further action will occur. Please
                        create a new cart order if desired.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Progress Timeline */
                  <div className="my-10 relative">
                    {/* Line Connector */}
                    <div className="absolute top-5 left-6 right-6 h-0.5 bg-[#EEEEEE] -z-0 hidden md:block" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
                      {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                          <div
                            key={step.status}
                            className="flex md:flex-col items-center md:text-center space-x-4 md:space-x-0"
                          >
                            {/* Circle Node */}
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                                isCompleted ? 'bg-black border-black text-white' : 'bg-white border-[#EEEEEE] text-[#717171]'
                              } ${isCurrent ? 'ring-4 ring-[#EEEEEE]' : ''}`}
                            >
                              <StepIcon className="h-4.5 w-4.5" />
                            </div>

                            {/* Label */}
                            <div className="mt-0 md:mt-3 flex-1">
                              <span
                                className={`text-xs font-bold uppercase tracking-wider block ${
                                  isCompleted ? 'text-black' : 'text-[#717171]'
                                }`}
                              >
                                {step.label}
                              </span>
                              <p className="text-[10px] text-[#717171] mt-1 md:max-w-xs md:mx-auto leading-relaxed">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer Controls: Cancel order (only if pending) */}
                {activeOrder.status === 'pending' && (
                  <div className="flex justify-end pt-4 border-t border-[#EEEEEE]">
                    <button
                      onClick={() => handleUserCancel(activeOrder.id)}
                      className="rounded-none border border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#F5F5F5] transition-colors"
                      id="cancel-order-user-btn"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>

              {/* DEMO / SELLER SIMULATION MODE */}
              <div className="rounded-none border border-[#EEEEEE] bg-[#FDFDFD] p-6 sm:p-8 space-y-4">
                <div className="flex items-start space-x-3 text-black">
                  <RefreshCw className="h-5 w-5 shrink-0 mt-0.5 text-black" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-black">
                      Seller & Courier Simulator Sandbox
                    </h4>
                    <p className="text-xs mt-2 text-[#717171] leading-relaxed">
                      Standard users do not update shipping status. However, to help you test the live tracking
                      progress, use these controls to manually advance this order's state!
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2" id="seller-sim-buttons">
                  {/* Confirm Order (advance to confirmed) */}
                  <button
                    onClick={() => handleSimulateStatus(activeOrder.id, 'confirmed')}
                    disabled={activeOrder.status !== 'pending' || simulating !== null}
                    className="rounded-none bg-black border border-black hover:bg-[#333333] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    id="sim-confirm-btn"
                  >
                    {simulating === 'confirmed' ? 'Processing...' : '1. Confirm Order'}
                  </button>

                  {/* Out for Delivery */}
                  <button
                    onClick={() => handleSimulateStatus(activeOrder.id, 'out_for_delivery')}
                    disabled={activeOrder.status !== 'confirmed' || simulating !== null}
                    className="rounded-none bg-black border border-black hover:bg-[#333333] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    id="sim-out-for-delivery-btn"
                  >
                    {simulating === 'out_for_delivery' ? 'Processing...' : '2. Out for Delivery'}
                  </button>

                  {/* Delivered */}
                  <button
                    onClick={() => handleSimulateStatus(activeOrder.id, 'delivered')}
                    disabled={activeOrder.status !== 'out_for_delivery' || simulating !== null}
                    className="rounded-none bg-black border border-black hover:bg-[#333333] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    id="sim-delivered-btn"
                  >
                    {simulating === 'delivered' ? 'Processing...' : '3. Confirm Delivery'}
                  </button>
                </div>
              </div>

              {/* Shipping Address and Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping info */}
                <div className="rounded-none border border-[#EEEEEE] bg-white p-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-black flex items-center space-x-1.5 border-b border-[#EEEEEE] pb-3">
                    <MapPin className="h-4 w-4 text-black" />
                    <span>Recipient Information</span>
                  </h4>
                  <div className="mt-4 space-y-3 text-xs leading-relaxed">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-[#717171] shrink-0" />
                      <span className="font-bold text-black uppercase tracking-wide text-xs">
                        {activeOrder.userName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-[#717171] shrink-0" />
                      <span className="font-mono text-black">{activeOrder.phone}</span>
                    </div>
                    <div className="flex items-start space-x-2 pt-2 border-t border-[#EEEEEE]">
                      <MapPin className="h-4 w-4 text-[#717171] shrink-0 mt-0.5" />
                      <span className="text-[#717171] font-semibold">{activeOrder.address}</span>
                    </div>
                  </div>
                </div>

                {/* Items and billing info */}
                <div className="rounded-none border border-[#EEEEEE] bg-white p-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-black flex items-center space-x-1.5 border-b border-[#EEEEEE] pb-3">
                    <ShoppingCart className="h-4 w-4 text-black" />
                    <span>Order Bill Breakdown</span>
                  </h4>
                  <div className="mt-4 divide-y divide-[#EEEEEE] max-h-[140px] overflow-y-auto pr-1">
                    {activeOrder.items.map((item, idx) => (
                      <div
                        key={item.productId + '-' + (item.selectedSize || idx) + '-' + (item.selectedVariant?.id || idx)}
                        className="flex flex-col py-2 border-b border-[#F9F9F9] last:border-0"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-[#717171] uppercase tracking-wide text-[10px] truncate max-w-[160px]">
                            {item.name} <span className="text-[#717171] font-normal">× {item.quantity}</span>
                          </span>
                          <span className="font-bold text-black font-mono">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedVariant && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-black uppercase font-mono tracking-wider bg-[#F5F5F5] px-1.5 py-0.5 border border-[#EEEEEE]">
                              {item.selectedVariant.colorCode && (
                                <span
                                  className="h-1.5 w-1.5 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: item.selectedVariant.colorCode }}
                                />
                              )}
                              <span>{item.selectedVariant.name}</span>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="text-[8px] font-bold text-black uppercase font-mono tracking-wider bg-[#F5F5F5] px-1 py-0.5 border border-[#EEEEEE]">
                              Size: {item.selectedSize}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-[#EEEEEE] pt-3 flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[#717171] font-bold">
                      Payment Status
                    </span>
                    <span className="text-xs font-bold text-black uppercase tracking-wider">
                      COD - Pay on Delivery
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-black uppercase tracking-wider">Grand Total Paid</span>
                    <span className="text-base font-bold text-black font-mono">
                      {formatCurrency(activeOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-none border border-dashed border-[#EEEEEE] p-12 text-center bg-white flex flex-col items-center justify-center min-h-[350px]">
              <ClipboardList className="h-10 w-10 text-[#717171]" />
              <h3 className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-black">No Selected Order</h3>
              <p className="mt-2 text-xs text-[#717171] max-w-sm leading-relaxed">
                Click on an order from your history list on the left to display its active shipping timeline and
                access testing controls.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
