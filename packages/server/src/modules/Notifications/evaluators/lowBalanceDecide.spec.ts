// © 2026 Bigfin
import { lowBalanceDecide } from './lowBalanceDecide';

describe('lowBalanceDecide', () => {
  it('нет счетов ниже порога → нет кандидата', () => {
    expect(
      lowBalanceDecide(
        [
          { name: 'Касса', amount: 5000 },
          { name: 'Расчётный', amount: 10000 },
        ],
        1000,
      ),
    ).toHaveLength(0);
  });
  it('есть счёт(а) ниже порога → один сводный кандидат', () => {
    const out = lowBalanceDecide(
      [
        { name: 'Касса', amount: 200 },
        { name: 'Расчётный', amount: 5000 },
      ],
      1000,
    );
    expect(out).toHaveLength(1);
    expect(out[0].eventType).toBe('low_balance');
    expect(out[0].payload.accounts).toHaveLength(1);
    expect(out[0].payload.accounts[0].name).toBe('Касса');
  });
  it('граничное значение amount === minAmount → НЕ входит в список (строго меньше)', () => {
    const out = lowBalanceDecide([{ name: 'Касса', amount: 1000 }], 1000);
    expect(out).toHaveLength(0);
  });
});
