// © 2026 Bigfin
import { readBalanceTotals } from './readBalanceTotals';

describe('итоги баланса для оценки стоимости', () => {
  it('берёт активы и обязательства из отчёта', () => {
    const nodes = [
      { id: 'ASSETS', total: { amount: 1_000_000 } },
      {
        id: 'LIABILITY_EQUITY',
        total: { amount: 1_000_000 },
        children: [{ id: 'LIABILITY', total: { amount: 400_000 } }],
      },
    ];

    expect(readBalanceTotals(nodes)).toEqual({
      assets: 1_000_000,
      liabilities: 400_000,
      found: true,
    });
  });

  it('находит обязательства ВНУТРИ «обязательств и капитала»', () => {
    // Плоский поиск по верхнему уровню вернул бы ноль, и чистые активы
    // молча оказались бы равны всем активам — то есть завышены на весь долг.
    const nodes = [
      {
        id: 'LIABILITY_EQUITY',
        total: { amount: 0 },
        children: [
          {
            id: 'SOMETHING',
            total: { amount: 0 },
            children: [{ id: 'LIABILITY', total: { amount: 250_000 } }],
          },
        ],
      },
    ];

    expect(readBalanceTotals(nodes).liabilities).toBe(250_000);
  });

  it('пустой отчёт — это НЕ «нулевая стоимость»', () => {
    // «Чистые активы 0 ₽» выглядят как расчёт, хотя считать было нечего.
    expect(readBalanceTotals([])).toEqual({
      assets: 0,
      liabilities: 0,
      found: false,
    });
  });

  it('узел без итога не роняет расчёт', () => {
    const nodes = [
      { id: 'ASSETS', total: null },
      { id: 'LIABILITY' },
    ];

    expect(readBalanceTotals(nodes as any)).toEqual({
      assets: 0,
      liabilities: 0,
      found: true,
    });
  });

  it('нечисловой итог считается нулём, а не «не числом»', () => {
    const nodes = [
      { id: 'ASSETS', total: { amount: 'что-то' as any } },
      { id: 'LIABILITY', total: { amount: 100 } },
    ];

    expect(readBalanceTotals(nodes as any).assets).toBe(0);
  });
});
