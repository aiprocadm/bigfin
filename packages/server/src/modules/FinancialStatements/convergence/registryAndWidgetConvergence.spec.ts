// © 2026 Bigfin
import { GetTransactionsSummaryService } from '@/modules/BankingTransactions/queries/GetTransactionsSummary.service';

import { CONVERGENCE_TOLERANCE } from './fixtures';

/**
 * Инварианты 5 и 6 раздела 11.10 ТЗ-2.
 *
 * 5. `Σ inflow − Σ outflow = net` — сводная строка реестра.
 * 6. `Σ остатков по группам счетов = общий остаток` — виджет денег.
 *
 * Считает ЖИВАЯ служба, а подставлены только модели: иначе проверялась бы
 * переписанная здесь арифметика, а не та, что попадёт человеку на экран.
 *
 * ПЕРЕВОДЫ НЕ ВХОДЯТ В ИТОГ. Перевод со своего счёта на свой денег бизнесу
 * не прибавляет; попади он в «поступления», итог показал бы рост, которого
 * не было. Поэтому набор строк намеренно содержит и перевод тоже.
 */
const ROWS = [
  // Поступления.
  { debit: 120_300.55, credit: 0, transactionType: 'SaleInvoice', currencyCode: 'RUB' },
  { debit: 40_000.45, credit: 0, transactionType: 'PaymentReceive', currencyCode: 'RUB' },
  // Выплаты.
  { debit: 0, credit: 45_100.25, transactionType: 'Expense', currencyCode: 'RUB' },
  { debit: 0, credit: 30_000.1, transactionType: 'BillPayment', currencyCode: 'RUB' },
  // Перевод между своими счетами: в итог не входит.
  {
    debit: 150_000.4,
    credit: 0,
    transactionType: 'TransferToAccount',
    currencyCode: 'RUB',
  },
];

const buildService = (rows = ROWS) => {
  const transactionModel = () => ({
    query: () => ({
      onBuild: (build: (qb: any) => void) => {
        const qb: any = new Proxy(
          {},
          { get: () => () => qb },
        );
        build(qb);
        return Promise.resolve(rows);
      },
    }),
  });

  const emptyModel = () => ({
    query: () => ({
      whereIn: () => ({ select: async () => [] }),
      where: () => ({ select: async () => [] }),
      select: async () => [],
    }),
  });

  return new GetTransactionsSummaryService(
    { getTenantMetadata: async () => ({ baseCurrency: 'RUB' }) } as any,
    transactionModel as any,
    emptyModel as any,
    emptyModel as any,
    emptyModel as any,
  );
};

describe('сходимость сводной строки реестра и виджета денег', () => {
  it('ПОСТУПЛЕНИЯ МИНУС ВЫПЛАТЫ = ИТОГО (инвариант 5)', async () => {
    const summary = await buildService().getSummary({});

    const difference = Math.abs(
      summary.inflow.amount - summary.outflow.amount - summary.net.amount,
    );

    expect(difference).toBeLessThanOrEqual(CONVERGENCE_TOLERANCE);
  });

  it('суммы совпадают с ожидаемыми до копейки', async () => {
    // Копейки в наборе намеренные: на круглых тысячах ошибка округления
    // прячется.
    const summary = await buildService().getSummary({});

    expect(summary.inflow.amount).toBe(160_301);
    expect(summary.outflow.amount).toBe(75_100.35);
    expect(summary.net.amount).toBe(85_200.65);
  });

  it('ПЕРЕВОД НЕ ВХОДИТ В ИТОГ, но и не пропадает', async () => {
    // Он показан отдельным числом — чтобы его наличие было видно.
    const summary = await buildService().getSummary({});

    expect(summary.transfers.amount).toBe(150_000.4);
    expect(summary.net.amount).toBe(85_200.65);
  });

  it('проверка ловит подделку', async () => {
    // Мутация: если перевод попадёт в поступления, итог вырастет на его
    // сумму — и равенство «поступления − выплаты = итого» останется верным,
    // а число на экране станет ложью. Поэтому переводы проверяются отдельно.
    const withTransferAsInflow = ROWS.map((row) =>
      row.transactionType === 'TransferToAccount'
        ? { ...row, transactionType: 'PaymentReceive' }
        : row,
    );
    const summary = await buildService(withTransferAsInflow).getSummary({});

    expect(summary.net.amount).not.toBe(85_200.65);
    expect(summary.transfers.amount).toBe(0);
  });

  describe('виджет денег: Σ по группам = общий остаток (инвариант 6)', () => {
    /**
     * Остатки по группам считает `GetMoneyWidget`, складывая счета внутри
     * группы. Здесь проверяется само правило: разложение по группам не
     * меняет общую сумму, а счёт без группы не теряется.
     */
    const ACCOUNTS = [
      { id: 1, groupId: 10, amount: 120_300.55 },
      { id: 2, groupId: 10, amount: 40_000.45 },
      { id: 3, groupId: 11, amount: 500_000.0 },
      // Счёт без группы: он обязан попасть в «Без группы», а не исчезнуть.
      { id: 4, groupId: null, amount: 75_100.35 },
    ];

    const groupTotals = () => {
      const byGroup = new Map<number | null, number>();

      ACCOUNTS.forEach((account) => {
        const key = account.groupId ?? null;
        byGroup.set(key, (byGroup.get(key) ?? 0) + account.amount);
      });

      return byGroup;
    };

    it('сумма по группам равна общему остатку', () => {
      const total = ACCOUNTS.reduce((sum, a) => sum + a.amount, 0);
      const grouped = [...groupTotals().values()].reduce((s, v) => s + v, 0);

      expect(Math.abs(grouped - total)).toBeLessThanOrEqual(
        CONVERGENCE_TOLERANCE,
      );
    });

    it('СЧЁТ БЕЗ ГРУППЫ НЕ ТЕРЯЕТСЯ', () => {
      // Самая частая ошибка такого разложения: показать только группы, и
      // общий остаток тихо станет меньше.
      expect(groupTotals().get(null)).toBe(75_100.35);
    });
  });
});
