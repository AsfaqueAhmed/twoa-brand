import { describe, it, expect } from 'vitest';
import { computeDeliveryFeeByZone, computeTotal, generateOrderId } from './pricing';

describe('computeDeliveryFeeByZone', () => {
  it('charges 70 for Dhaka city corporation (DNCC)', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', cityCorpId: 'dncc' })).toBe(70);
  });

  it('charges 70 for Dhaka city corporation (DSCC)', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', cityCorpId: 'dscc' })).toBe(70);
  });

  it('charges 110 for a Dhaka-suburban thana even without a city corporation', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', cityCorpId: 'outside_cc', thanaId: 'savar' })).toBe(110);
  });

  it('charges 110 for Gazipur Sadar (a different district than dhaka_dist)', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'gazipur', thanaId: 'gazipur_sadar' })).toBe(110);
  });

  it('charges 110 for the newly added Ashulia and Tongi thanas', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', thanaId: 'ashulia' })).toBe(110);
    expect(computeDeliveryFeeByZone({ districtId: 'gazipur', thanaId: 'tongi' })).toBe(110);
  });

  it('charges 130 for a Dhaka-district thana inside DCC but with no city corporation selected', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', thanaId: 'mirpur' })).toBe(130);
  });

  it('charges 130 for an unrelated district', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'chattogram_dist', thanaId: 'kotwali' })).toBe(130);
  });

  it('charges 130 when nothing is selected yet', () => {
    expect(computeDeliveryFeeByZone({})).toBe(130);
  });
});

describe('computeTotal', () => {
  it('computes total as subtotal + delivery - discount, rounded to cents', () => {
    expect(computeTotal(100, 70, 0)).toBe(170);
    expect(computeTotal(50, 110, 10)).toBe(150);
  });
});

describe('generateOrderId', () => {
  it('generates an order id starting with ord_ and 12 hex chars', () => {
    expect(generateOrderId()).toMatch(/^ord_[0-9a-f]{12}$/);
  });
});
