import intl from 'react-intl-universal';
import { beforeAll, describe, expect, it } from 'vitest';

import ru from '@/lang/ru/index.json';
import { reconciliationHeadline, splitItems } from './reconciliationView';

describe('сверка: заголовок и списки (FT-040)', () => {
  beforeAll(() => {
    intl.init({ currentLocale: 'ru', locales: { ru } });
  });
  const money = (value: number) => `${value.toFixed(2)} ₽`;

  it('остаток банка известен — три числа, как в ТЗ', () => {
    expect(
      reconciliationHeadline({ our_balance: 583985.12, bank_balance: 591240, diff: 7254.88 }, money),
    ).toBe('Остаток в Bigfin 583985.12 ₽ · в банке 591240.00 ₽ · расхождение 7254.88 ₽');
  });

  it('остатка банка нет — сказано прямо, расхождение по операциям', () => {
    expect(reconciliationHeadline({ ourBalance: 100, bankBalance: null, diff: -40 }, money)).toContain(
      'остаток банка неизвестен',
    );
  });

  it('списки и сколько ещё не решено', () => {
    const view = splitItems([
      { side: 'missing_here' },
      { side: 'missing_bank', resolved_as: 'deleted' },
      { side: 'missing_bank' },
    ]);
    expect(view.missingHere).toHaveLength(1);
    expect(view.missingBank).toHaveLength(2);
    expect(view.open).toBe(2);
  });
});
