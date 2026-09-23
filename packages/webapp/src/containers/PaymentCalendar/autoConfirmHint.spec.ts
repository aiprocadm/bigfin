// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { autoConfirmHint } from './autoConfirmHint';

/** FT-052 ТЗ-3: подсказка говорит, что заполнить, а не только «не сработает». */
describe('подсказка автоподтверждения', () => {
  it('называет недостающие поля', () => {
    expect(autoConfirmHint({ amount: 100, plannedDate: '2026-10-10' })).toEqual({
      ready: false,
      missing: ['account', 'contact'],
    });
  });

  it('«с любым контрагентом» снимает требование контрагента', () => {
    expect(
      autoConfirmHint({ accountId: 1000, amount: 100, plannedDate: '2026-10-10', matchAnyContact: true }),
    ).toEqual({ ready: true, missing: [] });
  });
});
