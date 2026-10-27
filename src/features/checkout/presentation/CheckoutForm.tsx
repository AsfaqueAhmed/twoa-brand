'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, LogIn } from 'lucide-react';
import { divisions, districts, thanas, cityCorporations } from '../infrastructure/bangladeshAreas';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import { useCart } from '@/features/cart/presentation/CartProvider';
import { placeOrder, type DeliveryDetails } from '../application/placeOrder';
import { addGuestOrderId } from '@/features/orders/infrastructure/localStorageGuestOrdersRepository';
import { computeDeliveryFeeByZone, computeTotal } from '../domain/pricing';
import type { Coupon } from '@/features/coupons/domain/coupon';
import { applyCoupon } from '@/features/coupons/application/applyCoupon';
import { listActiveCoupons } from '@/features/coupons/application/listActiveCoupons';
import { meetsMinimumSubtotal, meetsDistrictRestriction } from '@/features/coupons/domain/coupon';
import DeliveryInfoCard, { type DeliveryInfoValues } from './DeliveryInfoCard';
import DeliveryZoneCard from './DeliveryZoneCard';
import PromoCard from './PromoCard';
import PaymentCard from './PaymentCard';
import CheckoutSummary from './CheckoutSummary';
import { pixelPurchase } from '@/shared/lib/metaPixel';

export default function CheckoutForm() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const { items: cartItems, subtotal, count, clearCart } = useCart();
  const [isPlacing, setIsPlacing] = useState(false);
  const onBack = () => router.push('/');

  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [thanaId, setThanaId] = useState('');
  const [cityCorpId, setCityCorpId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [error, setError] = useState('');

  // Promo Code / Discount state
  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [appliedDiscountAmount, setAppliedDiscountAmount] = useState(0);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  useEffect(() => {
    listActiveCoupons().then(setActiveCoupons);
  }, []);

  const deliveryFee = computeDeliveryFeeByZone({ districtId, cityCorpId, thanaId });

  const discountAmount = appliedCoupon ? appliedDiscountAmount : 0;

  const grandTotal = Math.max(0, computeTotal(subtotal, deliveryFee, discountAmount));

  const onPlaceOrder = async (deliveryDetails: DeliveryDetails) => {
    setIsPlacing(true);
    try {
      const orderId = await placeOrder({ user, cartItems, deliveryDetails });
      if (!user) addGuestOrderId(orderId);
      pixelPurchase({ orderId, value: grandTotal, contentIds: cartItems.map((i) => i.product.id) });
      clearCart();
      router.push('/orders');
    } finally {
      setIsPlacing(false);
    }
  };

  const handleApplyPromo = async (code: string) => {
    setPromoError('');
    setPromoSuccess('');
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setPromoError('Please enter a promo code.');
      return;
    }

    const result = await applyCoupon({
      code: cleanCode,
      user,
      subtotal,
      deliveryFee,
      districtId: districtId || undefined,
    });

    if (!result.valid || !result.coupon) {
      setPromoError(result.reason || 'Invalid promo code. Please try another one.');
      return;
    }

    setAppliedCoupon(result.coupon);
    setAppliedDiscountAmount(result.discountAmount || 0);
    setPromoSuccess(`Promo ${result.coupon.code} applied!`);
  };

  const handleRemovePromo = () => {
    setAppliedCoupon(null);
    setAppliedDiscountAmount(0);
    setPromoInput('');
    setPromoSuccess('');
    setPromoError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Input validations
    if (!name.trim()) {
      setError("Please provide the recipient's name.");
      return;
    }
    if (!phone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }
    // Simple phone check
    const cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 20) {
      setError('Please provide a valid contact phone number (8-20 digits).');
      return;
    }
    if (!divisionId) {
      setError('Please select your division.');
      return;
    }
    if (!districtId) {
      setError('Please select your district.');
      return;
    }
    if (!thanaId) {
      setError('Please select your thana / upazila.');
      return;
    }
    const isDhakaDistrict = districtId === 'dhaka_dist';
    if (isDhakaDistrict && !cityCorpId) {
      setError('Please select your City Corporation option.');
      return;
    }
    if (!streetAddress.trim()) {
      setError('Please enter your Street Address / details.');
      return;
    }

    const selectedDivision = divisions.find((d) => d.id === divisionId)?.name || '';
    const selectedDistrict = districts.find((d) => d.id === districtId)?.name || '';
    const selectedThana = thanas.find((t) => t.id === thanaId)?.name || '';
    const selectedCityCorp = isDhakaDistrict ? cityCorporations.find((cc) => cc.id === cityCorpId)?.name || '' : '';

    const formattedAddress = [
      streetAddress.trim(),
      selectedThana,
      selectedCityCorp,
      selectedDistrict,
      selectedDivision,
      'Bangladesh',
    ]
      .filter(Boolean)
      .join(', ');

    if (formattedAddress.length > 500) {
      setError('Address is too long. Maximum length is 500 characters.');
      return;
    }

    try {
      await onPlaceOrder({
        name: name.trim(),
        phone: phone.trim(),
        address: formattedAddress,
        districtId,
        cityCorpId: cityCorpId || undefined,
        thanaId,
        promoCode: appliedCoupon?.code,
        discount: discountAmount > 0 ? discountAmount : undefined,
        finalTotal: grandTotal,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    }
  };

  const selectedThana = thanas.find((t) => t.id === thanaId)?.name || '';
  const selectedCityCorp = cityCorporations.find((cc) => cc.id === cityCorpId)?.name || '';
  const selectedDistrictName = districts.find((d) => d.id === districtId)?.name || '';
  const zoneLabel = selectedCityCorp || [selectedThana, selectedDistrictName].filter(Boolean).join(', ');

  const deliveryValues: DeliveryInfoValues = { name, phone, divisionId, districtId, thanaId, cityCorpId, streetAddress };
  const onDeliveryChange = (patch: Partial<DeliveryInfoValues>) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.phone !== undefined) setPhone(patch.phone);
    if (patch.divisionId !== undefined) setDivisionId(patch.divisionId);
    if (patch.districtId !== undefined) setDistrictId(patch.districtId);
    if (patch.thanaId !== undefined) setThanaId(patch.thanaId);
    if (patch.cityCorpId !== undefined) setCityCorpId(patch.cityCorpId);
    if (patch.streetAddress !== undefined) setStreetAddress(patch.streetAddress);
  };

  const visibleOffers = activeCoupons.filter(
    (c) =>
      meetsMinimumSubtotal(c, subtotal) &&
      meetsDistrictRestriction(c, districtId || undefined) &&
      !(c.discountType === 'free_shipping' && deliveryFee === 0)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="checkout-view-container">
      <nav className="flex items-center gap-2 text-sm text-[#717171]">
        <button
          type="button"
          onClick={() => router.push('/cart')}
          className="inline-flex items-center gap-2 hover:text-black transition-colors"
          id="checkout-back-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Cart</span>
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-black">Checkout</span>
      </nav>

      <h1 className="mt-3 text-4xl font-bold text-black">Checkout</h1>
      <p className="text-sm text-[#717171] mt-1 mb-6">Complete your order. Pay easily with Cash on Delivery.</p>

      {/* Optional sign-in nudge — guest checkout is fully supported, this is just a convenience offer */}
      {!user && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#EEEEEE] bg-[#FAF9F6] p-4 mb-6"
          id="checkout-guest-signin-nudge"
        >
          <p className="text-xs text-[#717171] leading-relaxed">
            Checking out as a guest — your order will be tracked on this device. Want to sync your order history
            across devices instead?
          </p>
          <button
            type="button"
            onClick={signIn}
            className="flex items-center justify-center space-x-1.5 border border-black bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors shrink-0"
            id="checkout-guest-signin-btn"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In (Optional)</span>
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start"
      >
        <div className="space-y-6">
          {error && (
            <div
              className="border border-red-200 bg-red-50 p-4 text-xs font-bold uppercase tracking-wider text-red-800"
              id="checkout-error"
            >
              {error}
            </div>
          )}
          <DeliveryInfoCard values={deliveryValues} onChange={onDeliveryChange} />
          <DeliveryZoneCard deliveryFee={deliveryFee} zoneLabel={zoneLabel} hasZone={!!thanaId} />
          <PromoCard
            promoInput={promoInput}
            onPromoInputChange={setPromoInput}
            onApply={handleApplyPromo}
            appliedCoupon={appliedCoupon}
            offers={visibleOffers}
            promoError={promoError}
            promoSuccess={promoSuccess}
          />
          <PaymentCard />
        </div>

        <CheckoutSummary
          items={cartItems}
          count={count}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          zoneLabel={zoneLabel}
          discountAmount={discountAmount}
          appliedCoupon={appliedCoupon}
          grandTotal={grandTotal}
          isPlacing={isPlacing}
          onRemovePromo={handleRemovePromo}
        />
      </form>
    </div>
  );
}
