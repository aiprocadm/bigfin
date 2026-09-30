import moment from 'moment';
import { describe, expect, it } from 'vitest';

import { elapsedShare } from './BudgetCard';

describe('сколько прошло года бюджета', () => {
  it('до начала — 0, после конца — 1, в середине — доля', () => {
    expect(elapsedShare(2026, moment('2025-12-31'))).toBe(0);
    expect(elapsedShare(2026, moment('2027-01-02'))).toBe(1);
    expect(elapsedShare(2026, moment('2026-07-02'))).toBeCloseTo(0.5, 1);
  });
});
