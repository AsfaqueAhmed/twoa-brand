import { MapPin, User as UserIcon } from 'lucide-react';
import { divisions, districts, thanas, cityCorporations } from '../infrastructure/bangladeshAreas';

export interface DeliveryInfoValues {
  name: string;
  phone: string;
  divisionId: string;
  districtId: string;
  thanaId: string;
  cityCorpId: string;
  streetAddress: string;
}

interface Props {
  values: DeliveryInfoValues;
  onChange: (patch: Partial<DeliveryInfoValues>) => void;
}

const LABEL = 'block text-sm text-black mb-1.5';
const INPUT =
  'w-full border border-[#EEEEEE] bg-[#FAF9F6] py-3 px-4 text-sm text-black placeholder-[#A1A1A1] focus:border-black focus:bg-white focus:outline-none transition-colors';
const SELECT = `${INPUT} cursor-pointer disabled:bg-[#F5F5F5] disabled:text-[#A1A1A1] disabled:cursor-not-allowed`;

const Required = () => <span className="text-red-500"> *</span>;

export default function DeliveryInfoCard({ values, onChange }: Props) {
  const { name, phone, divisionId, districtId, thanaId, cityCorpId, streetAddress } = values;

  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6" id="checkout-delivery-card">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-black">
        <UserIcon className="h-5 w-5" />
        <span>Delivery Information</span>
      </h2>

      <div className="mt-4 space-y-4">
        <div>
          <label className={LABEL} htmlFor="checkout-name-input">
            Full Name<Required />
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter your full name"
            maxLength={100}
            className={INPUT}
            id="checkout-name-input"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="checkout-phone-input">
            Phone Number<Required />
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="01XXX XXXXXXX"
            maxLength={20}
            className={INPUT}
            id="checkout-phone-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL} htmlFor="checkout-division-select" id="checkout-division-label">
              Division<Required />
            </label>
            <select
              value={divisionId}
              onChange={(e) =>
                onChange({ divisionId: e.target.value, districtId: '', thanaId: '', cityCorpId: '' })
              }
              className={SELECT}
              id="checkout-division-select"
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="checkout-district-select" id="checkout-district-label">
              District<Required />
            </label>
            <select
              value={districtId}
              disabled={!divisionId}
              onChange={(e) => onChange({ districtId: e.target.value, thanaId: '', cityCorpId: '' })}
              className={SELECT}
              id="checkout-district-select"
            >
              <option value="">Select district</option>
              {districts
                .filter((d) => d.divisionId === divisionId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="checkout-thana-select" id="checkout-thana-label">
              Area / Thana<Required />
            </label>
            <select
              value={thanaId}
              disabled={!districtId}
              onChange={(e) => onChange({ thanaId: e.target.value })}
              className={SELECT}
              id="checkout-thana-select"
            >
              <option value="">Select area / thana</option>
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
            <label className={LABEL} htmlFor="checkout-citycorp-select" id="checkout-citycorp-label">
              Dhaka City Corporation<Required />
            </label>
            <p className="text-xs text-[#717171] mb-3">
              Please select the correct city corporation context for your delivery in Dhaka.
            </p>
            <select
              value={cityCorpId}
              onChange={(e) => onChange({ cityCorpId: e.target.value })}
              className={`${SELECT} border-black bg-white`}
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

        <div>
          <label className={LABEL} htmlFor="checkout-streetaddress-input" id="checkout-streetaddress-label">
            Full Address<Required />
          </label>
          <div className="relative">
            <MapPin className="absolute top-3.5 left-4 h-4 w-4 text-[#A1A1A1]" />
            <textarea
              rows={3}
              value={streetAddress}
              onChange={(e) => onChange({ streetAddress: e.target.value })}
              placeholder="House no, road no, block, area and nearby landmark (e.g. near BRAC bank)"
              maxLength={300}
              className={`${INPUT} pl-11`}
              id="checkout-streetaddress-input"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
