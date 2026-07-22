import { describe, it, expect } from 'vitest';
import { matchesSearch, filterProducts, getCategories, getSubcategories } from './filter';
import type { Product } from '@/shared/domain/types';

const products: Product[] = [
  { id: '1', name: 'Black Backpack', description: 'Durable pack', price: 50, image: '', category: 'Bags', subcategory: 'Backpacks', rating: 5, stock: 3 },
  { id: '2', name: 'White Mug', description: 'Ceramic mug', price: 10, image: '', category: 'Kitchen', subcategory: 'Mugs', rating: 4, stock: 0 },
  { id: '3', name: 'Tote Bag', description: 'Canvas tote', price: 20, image: '', category: 'Bags', subcategory: 'Totes', rating: 5, stock: 5 },
];

describe('catalog filter domain', () => {
  it('matchesSearch matches name or description case-insensitively', () => {
    expect(matchesSearch(products[0], 'black')).toBe(true);
    expect(matchesSearch(products[0], 'durable')).toBe(true);
    expect(matchesSearch(products[0], 'nope')).toBe(false);
  });

  it('filterProducts filters by search text', () => {
    expect(filterProducts(products, { search: 'mug' })).toEqual([products[1]]);
  });

  it('filterProducts filters by category', () => {
    expect(filterProducts(products, { category: 'Bags' })).toEqual([products[0], products[2]]);
  });

  it('filterProducts filters by subcategory', () => {
    expect(filterProducts(products, { category: 'Bags', subcategory: 'Totes' })).toEqual([products[2]]);
  });

  it('getCategories returns unique categories prefixed with All', () => {
    expect(getCategories(products)).toEqual(['All', 'Bags', 'Kitchen']);
  });

  it('getSubcategories returns unique subcategories for a category prefixed with All', () => {
    expect(getSubcategories(products, 'Bags')).toEqual(['All', 'Backpacks', 'Totes']);
  });
});
