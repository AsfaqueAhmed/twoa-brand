import { AlertCircle, CheckCircle2, Clock, PackageCheck, Truck } from 'lucide-react';
import type { OrderStatus } from '@/shared/domain/types';

const STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: PackageCheck },
];

const BANNERS: Record<Exclude<OrderStatus, 'cancelled'>, { title: string; text: string }> = {
  pending: { title: 'Order received!', text: 'We have your order and will confirm it shortly.' },
  confirmed: { title: 'Order confirmed!', text: 'We are verifying and packing your items.' },
  out_for_delivery: {
    title: 'Your order is out for delivery!',
    text: 'Our delivery partner is on the way. Please keep your phone nearby.',
  },
  delivered: { title: 'Delivered!', text: 'Your order has been delivered. Thank you for shopping with us.' },
};

export default function OrderStatusStepper({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-red-800">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold">This order was cancelled</h4>
          <p className="text-xs mt-1">No further action will occur. You can place a new order any time.</p>
        </div>
      </div>
    );
  }

  const current = STEPS.findIndex((s) => s.status === status);
  const banner = BANNERS[status];

  return (
    <div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map(({ status: s, label, icon: Icon }, i) => {
          const done = i <= current;
          return (
            <li key={s} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span
                  className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${i <= current ? 'bg-[#1F4D2B]' : 'bg-[#EEEEEE]'}`}
                />
              )}
              <span
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${
                  done ? 'bg-[#1F4D2B] border-[#1F4D2B] text-white' : 'bg-white border-[#DDDDDD] text-[#A1A1A1]'
                } ${i === current ? 'ring-4 ring-[#DDE8DD]' : ''}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className={`mt-2 text-xs font-medium ${done ? 'text-[#1F4D2B]' : 'text-[#717171]'}`}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex items-center gap-4 bg-[#F1F7F1] p-4" id="order-status-banner">
        <Truck className="h-7 w-7 text-[#1F4D2B] shrink-0" />
        <div>
          <p className="text-sm font-bold text-[#1F4D2B]">{banner.title}</p>
          <p className="text-xs text-[#4B6B53]">{banner.text}</p>
        </div>
      </div>
    </div>
  );
}
