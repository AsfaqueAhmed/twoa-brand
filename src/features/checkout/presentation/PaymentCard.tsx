import { CreditCard, Truck } from 'lucide-react';

export default function PaymentCard() {
  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6" id="checkout-payment-card">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-black">
        <CreditCard className="h-5 w-5" />
        <span>Payment Method</span>
      </h2>
      <p className="text-xs text-[#717171] mt-1">We currently accept only Cash on Delivery.</p>

      <div className="mt-4 flex items-center gap-4 border border-black p-4">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-black shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-black" />
        </span>
        <Truck className="h-7 w-7 text-black shrink-0" />
        <div>
          <p className="text-sm font-bold text-black">Cash on Delivery</p>
          <p className="text-xs text-[#717171]">Pay when you receive your order. No online payment required.</p>
        </div>
      </div>
    </section>
  );
}
