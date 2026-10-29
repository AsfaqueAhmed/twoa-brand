'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { divisions, districts, thanas, cityCorporations } from '@/features/checkout/infrastructure/bangladeshAreas';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import { addGuestOrderId } from '@/features/orders/infrastructure/localStorageGuestOrdersRepository';
import { computeDeliveryFeeByZone, computeTotal, generateOrderId } from '@/features/checkout/domain/pricing';
import DeliveryInfoCard, { type DeliveryInfoValues } from '@/features/checkout/presentation/DeliveryInfoCard';
import DeliveryZoneCard from '@/features/checkout/presentation/DeliveryZoneCard';
import PaymentCard from '@/features/checkout/presentation/PaymentCard';
import { pixelPurchase } from '@/shared/lib/metaPixel';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { ThumbImage } from '@/shared/ui/ThumbImage';
import { customOrderSubtotal, describeLines, type QuoteCheckout } from '../domain/customOrder';
import { fetchQuoteForCheckout, placeCustomOrder, previewPublicUrl } from '../infrastructure/customOrderRepository';

function InvalidState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center" id="custom-order-invalid">
      <h1 className="text-2xl font-bold text-black">Quote unavailable</h1>
      <p className="mt-3 text-sm text-[#717171]">This quote link is no longer valid. Please contact us on WhatsApp.</p>
    </div>
  );
}

export default function CustomOrderPage() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<{ status: 'loading' } | { status: 'invalid' } | { status: 'error' } | { status: 'ready'; quote: QuoteCheckout }>({
    status: 'loading',
  });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ status: 'invalid' });
      return;
    }
    setState({ status: 'loading' });
    fetchQuoteForCheckout(token)
      .then((quote) => {
        if (!cancelled) setState(quote ? { status: 'ready', quote } : { status: 'invalid' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  if (state.status === 'loading') {
    return <p className="px-4 py-16 text-center text-sm text-[#717171]">Loading your quote...</p>;
  }
  if (state.status === 'invalid') return <InvalidState />;
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" id="custom-order-error">
        <h1 className="text-2xl font-bold text-black">Couldn&apos;t load your quote</h1>
        <p className="mt-3 text-sm text-[#717171]">Something went wrong while loading. Please check your connection and try again.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    );
  }
  return <ReadyView token={token} quote={state.quote} />;
}

function ReadyView({ token, quote }: { token: string; quote: QuoteCheckout }) {
  const router = useRouter();
  const { user } = useAuth();
  const [isPlacing, setIsPlacing] = useState(false);
  const [name, setName] = useState(quote.name);
  const [phone, setPhone] = useState(quote.phone);
  const [divisionId, setDivisionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [thanaId, setThanaId] = useState('');
  const [cityCorpId, setCityCorpId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [error, setError] = useState('');

  const subtotal = customOrderSubtotal(quote);
  const count = quote.lines.reduce((s, l) => s + l.qty, 0);
  const deliveryFee = computeDeliveryFeeByZone({ districtId, cityCorpId, thanaId });
  const grandTotal = Math.max(0, computeTotal(subtotal, deliveryFee, 0));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError("Please provide the recipient's name.");
    if (!phone.trim()) return setError('Please provide a contact phone number.');
    const cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 20) {
      return setError('Please provide a valid contact phone number (8-20 digits).');
    }
    if (!divisionId) return setError('Please select your division.');
    if (!districtId) return setError('Please select your district.');
    if (!thanaId) return setError('Please select your thana / upazila.');
    const isDhakaDistrict = districtId === 'dhaka_dist';
    if (isDhakaDistrict && !cityCorpId) return setError('Please select your City Corporation option.');
    if (!streetAddress.trim()) return setError('Please enter your Street Address / details.');

    const selectedDivision = divisions.find((d) => d.id === divisionId)?.name || '';
    const selectedDistrict = districts.find((d) => d.id === districtId)?.name || '';
    const selectedThanaName = thanas.find((t) => t.id === thanaId)?.name || '';
    const selectedCityCorpName = isDhakaDistrict ? cityCorporations.find((cc) => cc.id === cityCorpId)?.name || '' : '';
    const formattedAddress = [streetAddress.trim(), selectedThanaName, selectedCityCorpName, selectedDistrict, selectedDivision, 'Bangladesh']
      .filter(Boolean)
      .join(', ');
    if (formattedAddress.length > 500) return setError('Address is too long. Maximum length is 500 characters.');

    setIsPlacing(true);
    try {
      const orderId = await placeCustomOrder({
        token,
        orderId: generateOrderId(),
        userId: user ? user.uid : 'guest',
        userEmail: user?.email || '',
        name: name.trim(),
        phone: phone.trim(),
        address: formattedAddress,
        deliveryFee,
      });
      if (!user) addGuestOrderId(orderId);
      // Strip the one-time token from the URL so the pixel's page-location doesn't carry it.
      window.history.replaceState(window.history.state, '', window.location.pathname);
      pixelPurchase({ orderId, value: grandTotal, contentIds: [quote.parentProductId || quote.id] });
      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-4 sm:py-8 sm:px-6 lg:px-8" id="custom-order-container">
      <h1 className="text-2xl sm:text-4xl font-bold text-black">Your Custom Order</h1>
      <p className="text-xs sm:text-sm text-[#717171] mt-1 mb-4 sm:mb-6">
        Quote {quote.id}. Confirm your delivery details. Pay easily with Cash on Delivery.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-4 sm:gap-6 items-start">
        <div className="space-y-4 sm:space-y-6">
          {error && (
            <div className="border border-red-200 bg-red-50 p-4 text-xs font-bold uppercase tracking-wider text-red-800" id="custom-order-error">
              {error}
            </div>
          )}
          <DeliveryInfoCard values={deliveryValues} onChange={onDeliveryChange} />
          <DeliveryZoneCard deliveryFee={deliveryFee} zoneLabel={zoneLabel} hasZone={!!thanaId} />
          <PaymentCard />
        </div>

        <aside className="border border-[#EEEEEE] bg-white p-4 sm:p-6 space-y-4 sm:space-y-5 lg:sticky lg:top-24" id="custom-order-summary">
          <h2 className="text-xl sm:text-2xl font-bold text-black border-b border-[#EEEEEE] pb-4">Order Summary</h2>

          {quote.previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quote.previews.map((p) => (
                <figure key={p.viewId} className="w-24">
                  <ThumbImage
                    src={previewPublicUrl(p.path)}
                    alt={`${p.label} preview`}
                    className="h-28 w-24 object-contain bg-[#F5F5F5] border border-[#EEEEEE]"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <figcaption className="mt-1 text-center text-[11px] text-[#717171]">{p.label}</figcaption>
                </figure>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-black">{quote.parentName || 'Custom T-shirt'}</h3>
            <p className="text-xs text-[#717171] mt-1">
              {[quote.colorName && `Color: ${quote.colorName}`, quote.teeSize && `Size: ${quote.teeSize}`].filter(Boolean).join('  |  ')}
            </p>
            <p className="text-xs text-[#717171] mt-0.5">{describeLines(quote.lines)}</p>
            <p className="text-xs text-[#717171] mt-0.5">{formatCurrency(quote.unitPrice)} per piece</p>
          </div>

          <div className="space-y-2 text-sm border-t border-[#EEEEEE] pt-4">
            <div className="flex justify-between text-[#717171]">
              <span>Subtotal ({count} {count === 1 ? 'piece' : 'pieces'})</span>
              <span className="text-black">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#717171]">
              <span>Shipping Charge{zoneLabel ? ` (${zoneLabel})` : ''}</span>
              <span className="text-black">{formatCurrency(deliveryFee)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between bg-[#F1F7F1] px-4 py-3">
            <span className="text-xl font-bold text-black">Total</span>
            <span className="text-2xl font-bold text-black" id="custom-order-grand-total">{formatCurrency(grandTotal)}</span>
          </div>

          <div className="flex items-center gap-3 bg-[#F1F7F1] p-4">
            <ShieldCheck className="h-7 w-7 text-[#1F4D2B] shrink-0" />
            <div>
              <p className="text-sm font-bold text-black">100% Risk-Free</p>
              <p className="text-xs text-[#717171]">Check your product before payment. Easy return if there is any issue.</p>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-[#EEEEEE] bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:static sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <div className="shrink-0 sm:hidden">
              <p className="text-[11px] text-[#717171]">Total (COD)</p>
              <p className="text-lg font-bold leading-tight text-black">{formatCurrency(grandTotal)}</p>
            </div>
            <button
              type="submit"
              disabled={isPlacing}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 bg-black py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-[#A1A1A1] sm:w-full sm:flex-none sm:py-4"
              id="custom-order-submit-btn"
            >
              {isPlacing ? (
                <span>Creating Order...</span>
              ) : (
                <>
                  <Lock className="h-4 w-4 shrink-0 sm:shrink" />
                  <span>Place Order<span className="hidden sm:inline"> (Cash on Delivery)</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 sm:shrink" />
                </>
              )}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
