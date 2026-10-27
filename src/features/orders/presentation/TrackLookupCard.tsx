import { useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  loading: boolean;
  error: string;
  onTrack: (orderNumber: string, phone: string) => void;
}

const LABEL = 'block text-sm text-black mb-1.5';
const INPUT =
  'w-full border border-[#EEEEEE] bg-[#FAF9F6] py-3 px-4 text-sm text-black placeholder-[#A1A1A1] focus:border-black focus:bg-white focus:outline-none transition-colors';

export default function TrackLookupCard({ loading, error, onTrack }: Props) {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onTrack(orderNumber, phone);
      }}
      className="border border-[#EEEEEE] bg-white p-5 sm:p-6"
      id="track-lookup-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <div>
          <label className={LABEL} htmlFor="track-order-number">
            Order Number <span className="text-red-500">*</span>
          </label>
          <input
            id="track-order-number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. 2A12345678"
            maxLength={20}
            className={`${INPUT} uppercase font-mono`}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="track-phone">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="track-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 01XXX XXXXXX"
            maxLength={20}
            className={INPUT}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-black px-8 py-3 text-sm font-bold text-white hover:bg-[#333333] transition-colors disabled:opacity-60"
          id="track-order-btn"
        >
          <Search className="h-4 w-4" />
          <span>{loading ? 'Searching...' : 'Track Order'}</span>
        </button>
      </div>
      {error && (
        <p className="mt-3 text-xs font-bold text-red-600" id="track-error">
          {error}
        </p>
      )}
    </form>
  );
}
