import { describe, it, expect } from 'vitest';
import { averageOrderValue, changeCaption, filterByName, repeatRate, revenueShare } from './reportStats';

describe('reportStats', () => {
  it('averageOrderValue guards zero', () => {
    expect(averageOrderValue(300, 3)).toBe(100);
    expect(averageOrderValue(300, 0)).toBe(0);
  });
  it('revenueShare', () => {
    expect(revenueShare(25, 200)).toBe(12.5);
    expect(revenueShare(1, 3)).toBe(33.3);
    expect(revenueShare(5, 0)).toBe(0);
  });
  it('repeatRate guards zero', () => {
    expect(repeatRate(3, 1)).toBe(25);
    expect(repeatRate(0, 0)).toBe(0);
    expect(repeatRate(0, 4)).toBe(100);
  });
  it('changeCaption', () => {
    expect(changeCaption(null)).toBeUndefined();
    expect(changeCaption(12)).toBe('+12% vs previous period');
    expect(changeCaption(-5)).toBe('-5% vs previous period');
    expect(changeCaption(0)).toBe('0% vs previous period');
  });
  it('filterByName', () => {
    const l = [{ name: 'Red Shirt' }, { name: 'Blue Jeans' }];
    expect(filterByName(l, ' shirt ')).toEqual([l[0]]);
    expect(filterByName(l, '')).toEqual(l);
  });
});
