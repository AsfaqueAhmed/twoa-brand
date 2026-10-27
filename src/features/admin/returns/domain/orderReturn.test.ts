import { describe, it, expect } from 'vitest';
import { NEXT_RETURN_STATUSES } from './orderReturn';

describe('NEXT_RETURN_STATUSES', () => {
  it('requested can be approved or rejected', () => expect(NEXT_RETURN_STATUSES('requested')).toEqual(['approved', 'rejected']));
  it('approved can be refunded', () => expect(NEXT_RETURN_STATUSES('approved')).toEqual(['refunded']));
  it('rejected and refunded are terminal', () => {
    expect(NEXT_RETURN_STATUSES('rejected')).toEqual([]);
    expect(NEXT_RETURN_STATUSES('refunded')).toEqual([]);
  });
});
