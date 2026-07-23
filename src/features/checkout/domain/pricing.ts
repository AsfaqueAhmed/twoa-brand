export const CITY_CORPORATION_DELIVERY_FEE = 70;
export const DHAKA_SUBURBAN_DELIVERY_FEE = 110;
export const STANDARD_DELIVERY_FEE = 130;

const DHAKA_CITY_CORPORATION_IDS = ['dncc', 'dscc'];

// Savar, Ashulia, Keraniganj, Tongi, Narayanganj Sadar, Dhamrai, Nawabganj, Dohar,
// Gazipur Sadar — the "Dhaka Sub" delivery zone. Every other named place in that
// zone description (EPZ, Jahangirnagar University, Siddhirganj, etc.) is a
// sub-locality of one of these thanas, not a separate selectable area.
const DHAKA_SUBURBAN_THANA_IDS = [
  'savar',
  'ashulia',
  'keraniganj',
  'tongi',
  'narayanganj_sadar',
  'dhamrai',
  'nawabganj',
  'dohar',
  'gazipur_sadar',
];

export function computeDeliveryFeeByZone(params: {
  districtId?: string;
  cityCorpId?: string;
  thanaId?: string;
}): number {
  const { districtId, cityCorpId, thanaId } = params;
  if (districtId === 'dhaka_dist' && cityCorpId && DHAKA_CITY_CORPORATION_IDS.includes(cityCorpId)) {
    return CITY_CORPORATION_DELIVERY_FEE;
  }
  if (thanaId && DHAKA_SUBURBAN_THANA_IDS.includes(thanaId)) {
    return DHAKA_SUBURBAN_DELIVERY_FEE;
  }
  return STANDARD_DELIVERY_FEE;
}

export function computeTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  return Math.round((subtotal + deliveryFee - discount) * 100) / 100;
}

export function generateOrderId(): string {
  // Guest orders have no Firebase Auth identity backing them — this ID doubles as
  // the guest's only access credential (see firestore.rules), so it needs to be
  // unguessable, not just unique. 20 hex chars = 80 bits of randomness.
  const randomHex = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `ord_${randomHex}`;
}
