import { describe, expect, it } from 'vitest';
import { MOBILE_FONTS } from './fonts';

describe('fonts', () => {
  it('provides Bengali and Latin fonts', () => {
    expect(MOBILE_FONTS.some((f) => f.script === 'bengali')).toBe(true);
    expect(MOBILE_FONTS.some((f) => f.script === 'latin')).toBe(true);
    expect(MOBILE_FONTS.some((f) => f.label.includes('Noto Sans Bengali'))).toBe(true);
    expect(MOBILE_FONTS.some((f) => f.label.includes('Hind Siliguri'))).toBe(true);
  });
});
