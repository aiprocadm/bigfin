import { describe, expect, it, vi } from 'vitest';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      ({
        'dashboard.directions_profit.margin_unknown': 'н/о',
        'dashboard.directions_profit.loss': 'убыток',
      })[key] ?? key,
  },
}));
vi.mock('@/utils/organizationMoney', () => ({ formatOrganizationMoney: (n: number) => `${n} ₽` }));
vi.mock('@/utils/formatShortDate', () => ({ uiLocale: () => 'ru-RU' }));

import { directionCaption, marginText } from './DirectionsProfitSection';

/** C20 (UI-051-5 ТЗ-4): подпись у полосы направления. */
describe('подпись направления', () => {
  const row = { projectId: 1, name: 'Опт', revenue: 100, costs: 70, profit: 30, marginPercent: 30, isLoss: false };

  it('прибыль и рентабельность', () => {
    expect(directionCaption(row)).toBe('30 ₽ · 30 %');
  });

  it('убыток — словами, не цветом', () => {
    expect(directionCaption({ ...row, profit: -5, marginPercent: -153.33, isLoss: true })).toBe('-5 ₽ · -153,3 % · убыток');
  });

  it('без выручки — «н/о», а не 0 %', () => {
    expect(marginText({ marginPercent: null })).toBe('н/о');
  });
});
