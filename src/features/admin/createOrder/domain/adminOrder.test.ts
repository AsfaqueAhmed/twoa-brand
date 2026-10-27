import { describe, it, expect } from 'vitest';
import type { CartItem } from '@/shared/domain/types';
import {
  lineSubtotal, draftSubtotal, newCustomItemId, adminOrderTotal, formatAdminAddress,
  buildAdminOrderItems, validateDraft, type DraftLine,
} from './adminOrder';

const product = { id: 'p1', name: 'Tee', description: '', price: 500, image: 'tee.png', category: 'c', rating: 0, parentProductId: 'pp1' };
const catalog = (qty: number, size = 'M'): DraftLine => ({ kind: 'catalog', item: { product, quantity: qty, selectedSize: size } as CartItem });
const custom = (price: number, quantity: number): DraftLine => ({ kind: 'custom', id: 'custom_abc', name: 'Gift wrap', price, quantity });

describe('subtotals', () => {
  it('multiplies price by quantity per line and sums', () => {
    expect(lineSubtotal(catalog(2))).toBe(1000);
    expect(lineSubtotal(custom(50, 3))).toBe(150);
    expect(draftSubtotal([catalog(1), custom(50, 3)])).toBe(650);
  });
});

describe('newCustomItemId', () => {
  it('has the custom_ prefix and is unique', () => {
    const a = newCustomItemId();
    expect(a).toMatch(/^custom_[0-9a-f]{12}$/);
    expect(newCustomItemId()).not.toBe(a);
  });
});

describe('adminOrderTotal', () => {
  it('adds fee and subtracts discount', () => {
    expect(adminOrderTotal({ subtotal: 1000, deliveryFee: 70, discount: 100 })).toBe(970);
  });
  it('clamps discount to subtotal + fee and to zero', () => {
    expect(adminOrderTotal({ subtotal: 100, deliveryFee: 50, discount: 9999 })).toBe(0);
    expect(adminOrderTotal({ subtotal: 100, deliveryFee: 50, discount: -20 })).toBe(150);
  });
});

describe('formatAdminAddress', () => {
  it('matches the checkout format and skips empty parts', () => {
    expect(formatAdminAddress({ street: ' 12 Road ', thana: 'Savar', cityCorp: '', district: 'Dhaka', division: 'Dhaka' }))
      .toBe('12 Road, Savar, Dhaka, Dhaka, Bangladesh');
  });
});

describe('buildAdminOrderItems', () => {
  it('builds items for both kinds but reserves stock for catalog lines only', () => {
    const { items, cartLines } = buildAdminOrderItems([catalog(2), custom(50, 3)]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ productId: 'p1', quantity: 2, selectedSize: 'M' });
    expect(items[1]).toEqual({ productId: 'custom_abc', name: 'Gift wrap', price: 50, quantity: 3, image_url: '' });
    expect(cartLines).toEqual([{ parent_id: 'pp1', size: 'M', qty: 2 }]);
  });
  it('returns no cart lines when every line is custom', () => {
    expect(buildAdminOrderItems([custom(10, 1)]).cartLines).toEqual([]);
  });
});

describe('validateDraft', () => {
  const ok = { name: 'Rahim', phone: '01711111111', address: 'x', lines: [custom(10, 1)] };
  it('accepts a valid draft', () => expect(validateDraft(ok)).toBeNull());
  it('requires name, phone, address and at least one line', () => {
    expect(validateDraft({ ...ok, name: ' ' })).toBe('Customer name is required.');
    expect(validateDraft({ ...ok, phone: '' })).toBe('Phone number is required.');
    expect(validateDraft({ ...ok, address: '' })).toBe('Delivery address is required.');
    expect(validateDraft({ ...ok, lines: [] })).toBe('Add at least one item.');
  });
  it('rejects address over 500 chars and bad custom lines', () => {
    expect(validateDraft({ ...ok, address: 'a'.repeat(501) })).toBe('Address is too long. Maximum length is 500 characters.');
    expect(validateDraft({ ...ok, lines: [{ kind: 'custom', id: 'c', name: ' ', price: 10, quantity: 1 }] })).toBe('Every custom item needs a name.');
    expect(validateDraft({ ...ok, lines: [custom(-1, 1)] })).toBe('Custom item prices cannot be negative.');
    expect(validateDraft({ ...ok, lines: [custom(10, 0)] })).toBe('Quantities must be at least 1.');
  });
});
