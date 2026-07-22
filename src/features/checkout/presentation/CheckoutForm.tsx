'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, MapPin, Phone, User as UserIcon, Truck, ShoppingBag, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { divisions, districts, thanas, cityCorporations } from '../infrastructure/bangladeshAreas';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import { useCart } from '@/features/cart/presentation/CartProvider';
import { placeOrder, type DeliveryDetails } from '../application/placeOrder';
import { computeDeliveryFeeByZone, computeTotal } from '../domain/pricing';
import type { Coupon } from '@/features/coupons/domain/coupon';
import { applyCoupon } from '@/features/coupons/application/applyCoupon';
import { listActiveCoupons } from '@/features/coupons/application/listActiveCoupons';
import { meetsMinimumSubtotal, meetsDistrictRestriction } from '@/features/coupons/domain/coupon';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function CheckoutForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, subtotal, clearCart } = useCart();
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
    if (!user) return;
    setIsPlacing(true);
    try {
      await placeOrder({ user, cartItems, deliveryDetails });
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
    if (!user) return;

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" id="checkout-view-container">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-[0.15em] text-[#1A1A1A] hover:text-[#717171] border border-black px-4 py-2.5 bg-white transition-colors mb-8"
        id="checkout-back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Shop</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-none border border-[#EEEEEE] bg-white p-6 sm:p-8">
            <h2 className="text-sm font-bold text-black uppercase tracking-[0.2em] flex items-center space-x-2">
              <Truck className="h-5 w-5 text-black" />
              <span>Delivery Details</span>
            </h2>
            <p className="text-xs text-[#717171] mt-2">
              Please enter accurate contact and location details for prompt parcel delivery.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {error && (
                <div
                  className="rounded-none border border-black bg-white p-4 text-xs font-bold uppercase tracking-wider text-black"
                  id="checkout-error"
                >
                  {error}
                </div>
              )}

              {/* Recipient Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2">
                  Recipient Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute top-3.5 left-4 h-4.5 w-4.5 text-[#717171]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    maxLength={100}
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
                    id="checkout-name-input"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute top-3.5 left-4 h-4.5 w-4.5 text-[#717171]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    maxLength={20}
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
                    id="checkout-phone-input"
                  />
                </div>
              </div>

              {/* Bangladesh Geographic Selection */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Division Picker */}
                  <div>
                    <label
                      className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2"
                      id="checkout-division-label"
                    >
                      Division *
                    </label>
                    <select
                      value={divisionId}
                      onChange={(e) => {
                        setDivisionId(e.target.value);
                        setDistrictId('');
                        setThanaId('');
                        setCityCorpId('');
                      }}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 px-4 text-xs font-semibold text-black focus:border-black focus:outline-none cursor-pointer transition-colors"
                      id="checkout-division-select"
                    >
                      <option value="">Select Division</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Picker */}
                  <div>
                    <label
                      className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2"
                      id="checkout-district-label"
                    >
                      District *
                    </label>
                    <select
                      value={districtId}
                      disabled={!divisionId}
                      onChange={(e) => {
                        setDistrictId(e.target.value);
                        setThanaId('');
                        setCityCorpId('');
                      }}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 px-4 text-xs font-semibold text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#A1A1A1] disabled:cursor-not-allowed cursor-pointer transition-colors"
                      id="checkout-district-select"
                    >
                      <option value="">Select District</option>
                      {districts
                        .filter((d) => d.divisionId === divisionId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Thana Picker */}
                  <div>
                    <label
                      className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2"
                      id="checkout-thana-label"
                    >
                      Thana / Upazila *
                    </label>
                    <select
                      value={thanaId}
                      disabled={!districtId}
                      onChange={(e) => setThanaId(e.target.value)}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 px-4 text-xs font-semibold text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#A1A1A1] disabled:cursor-not-allowed cursor-pointer transition-colors"
                      id="checkout-thana-select"
                    >
                      <option value="">Select Thana</option>
                      {thanas
                        .filter((t) => t.districtId === districtId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* City Corporation Picker (ONLY for Dhaka district) */}
                {districtId === 'dhaka_dist' && (
                  <div className="bg-[#FAF9F6] border border-black/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label
                      className="block text-[10px] font-bold uppercase tracking-[0.15em] text-black mb-2"
                      id="checkout-citycorp-label"
                    >
                      Dhaka City Corporation *
                    </label>
                    <p className="text-[11px] text-[#717171] mb-3">
                      Please select the correct city corporation context for your delivery in Dhaka.
                    </p>
                    <select
                      value={cityCorpId}
                      onChange={(e) => setCityCorpId(e.target.value)}
                      className="w-full rounded-none border border-black bg-white py-3.5 px-4 text-xs font-semibold text-black focus:border-black focus:outline-none cursor-pointer"
                      id="checkout-citycorp-select"
                    >
                      <option value="">Select City Corporation</option>
                      {cityCorporations.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Detailed Street Address */}
                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2"
                    id="checkout-streetaddress-label"
                  >
                    Street Address / House & Road Details *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute top-3.5 left-4 h-4.5 w-4.5 text-[#717171]" />
                    <textarea
                      rows={3}
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. House 42, Road 12, Block B / Village, Post Office, and Local Landmark"
                      maxLength={300}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
                      id="checkout-streetaddress-input"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Option - COD Only */}
              <div className="pt-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2">
                  Available Payment Methods
                </label>
                <div className="rounded-none border border-black bg-white p-5 relative flex items-start space-x-3">
                  <div className="flex h-5 w-5 items-center justify-center bg-black text-white shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-black">
                        Cash on Delivery (COD)
                      </span>
                      <span className="bg-black text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest">
                        Default & Only
                      </span>
                    </div>
                    <p className="text-xs text-[#717171] mt-2 leading-relaxed">
                      Zero upfront risks. Hand over cash only after successfully receiving and reviewing your items
                      from the parcel courier.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isPlacing}
                  className="flex w-full items-center justify-center space-x-2 rounded-none bg-black py-4.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#333333] transition-colors disabled:bg-[#F5F5F5] disabled:text-[#A1A1A1] disabled:border-[#EEEEEE] disabled:cursor-not-allowed"
                  id="place-order-submit-btn"
                >
                  {isPlacing ? (
                    <span>Creating Order...</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4.5 w-4.5" />
                      <span>Confirm COD Order - {formatCurrency(grandTotal)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Order Summary Side panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-none border border-[#EEEEEE] bg-white p-6 sm:p-8">
            <h3 className="text-sm font-bold text-black uppercase tracking-[0.2em] flex items-center space-x-2 border-b border-[#EEEEEE] pb-4">
              <ShoppingBag className="h-5 w-5 text-black" />
              <span>Order Summary</span>
            </h3>

            {/* Cart products */}
            <div className="divide-y divide-[#EEEEEE] overflow-y-auto max-h-[180px] pr-2 mt-4">
              {cartItems.map((item) => {
                const itemKey = `${item.product.id}-${item.selectedSize || 'nosize'}-${item.selectedVariant?.id || 'novariant'}`;
                return (
                  <div key={itemKey} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={item.selectedVariant?.image || item.product.image}
                        alt={item.product.name}
                        className="h-11 w-11 rounded-none object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-black truncate">
                          {item.product.name}
                        </h4>

                        {/* Variant & Size badges */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedVariant && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#F5F5F5] text-black border border-[#EEEEEE]">
                              {item.selectedVariant.colorCode && (
                                <span
                                  className="h-2 w-2 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: item.selectedVariant.colorCode }}
                                />
                              )}
                              <span>{item.selectedVariant.name}</span>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#F5F5F5] text-black border border-[#EEEEEE] font-mono">
                              Size: {item.selectedSize}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-[#717171] mt-1 font-mono">
                          Qty: {item.quantity} × {formatCurrency(item.product.price)}
                          {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                            <span className="text-[9px] text-[#919191] line-through ml-1.5">
                              {formatCurrency(item.product.originalPrice)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-black font-mono ml-3">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Promo Code Input / Application */}
            <div className="mt-6 border-t border-[#EEEEEE] pt-6">
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#717171] mb-2">
                Have a Promo Code?
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between border border-black bg-black text-white p-3 mb-4 animate-in fade-in duration-200">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider block opacity-70">
                      Code Applied
                    </span>
                    <span className="text-xs font-bold tracking-widest font-mono">{appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-[9px] font-bold uppercase tracking-wider border border-white px-2.5 py-1 hover:bg-white hover:text-black transition-colors"
                    id="remove-promo-btn"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="e.g. WELCOME10"
                    className="flex-1 rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors font-mono uppercase"
                    id="promo-code-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo(promoInput)}
                    className="rounded-none bg-black px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#333333] transition-colors"
                    id="apply-promo-btn"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Promo messages */}
              {promoError && (
                <p className="text-[10px] text-red-600 font-bold mb-4 animate-in fade-in duration-150" id="promo-error-msg">
                  {promoError}
                </p>
              )}
              {promoSuccess && (
                <p
                  className="text-[10px] text-green-600 font-bold mb-4 animate-in fade-in duration-150"
                  id="promo-success-msg"
                >
                  {promoSuccess}
                </p>
              )}

              {/* Available Offers Accordion/List */}
              <div className="border border-[#EEEEEE] p-3 bg-[#FAF9F6] max-h-[180px] overflow-y-auto">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-[#717171] mb-2">
                  Active Promotions:
                </span>
                <div className="space-y-2">
                  {activeCoupons
                    .filter(
                      (c) =>
                        meetsMinimumSubtotal(c, subtotal) &&
                        meetsDistrictRestriction(c, districtId || undefined) &&
                        !(c.discountType === 'free_shipping' && deliveryFee === 0)
                    )
                    .map((c) => (
                      <div
                        key={c.code}
                        onClick={() => {
                          setPromoInput(c.code);
                          handleApplyPromo(c.code);
                        }}
                        className={`border p-2 bg-white cursor-pointer transition-all duration-200 text-left ${
                          appliedCoupon?.code === c.code ? 'border-black bg-black/5' : 'border-dashed border-[#DDDDDD] hover:border-black'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-black font-mono tracking-wider">{c.code}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
                            {c.discountType === 'percentage'
                              ? `${c.value}% OFF`
                              : c.discountType === 'flat'
                                ? `${formatCurrency(c.value)} OFF`
                                : 'FREE SHIPPING'}
                          </span>
                        </div>
                        <p className="text-[9px] text-[#717171] mt-0.5">
                          {c.minOrderSubtotal ? `Minimum order ${formatCurrency(c.minOrderSubtotal)}. ` : ''}
                          {c.districtRestriction ? 'Restricted delivery area.' : ''}
                        </p>
                      </div>
                    ))}
                  {activeCoupons.length === 0 && (
                    <p className="text-[9px] text-[#919191] italic">No active promotions right now.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing breakdown */}
            <div className="mt-6 border-t border-[#EEEEEE] pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#717171]">
                <span>Subtotal</span>
                <span className="font-bold text-black">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#717171]">
                <span>Shipping Fee</span>
                <span className="font-bold text-black">{formatCurrency(deliveryFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-bold animate-in fade-in duration-200">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#717171]">
                <span>Payment Method Fee</span>
                <span className="font-bold text-black uppercase tracking-wider text-[10px]">FREE (COD)</span>
              </div>
              <div className="flex justify-between border-t border-[#EEEEEE] pt-4 text-black font-semibold">
                <span className="font-bold uppercase tracking-[0.1em] text-[11px]">Grand Total</span>
                <span className="text-lg font-bold text-black font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
