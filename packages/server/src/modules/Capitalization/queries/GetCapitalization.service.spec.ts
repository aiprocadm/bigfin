// © 2026 Bigfin
import { GetCapitalizationService } from './GetCapitalization.service';

/**
 * «Сколько стоит мой бизнес» (этап 11 ТЗ).
 *
 * Оценка бизнеса — место, где легче всего нарисовать красивое число, которое
 * ничего не значит. Почти все проверки здесь про то, когда считать НЕЛЬЗЯ.
 */
const buildService = (options: {
  balanceNodes?: any[];
  rows?: any[];
  multiple?: number | null;
  primary?: any;
} = {}) => {
  const balanceSheet = {
    balanceSheet: async () => ({ data: options.balanceNodes ?? [] }),
  };

  const rollup = {
    getRollup: async () => options.rows ?? [],
  };

  const settings = {
    getSettings: async () => ({
      profitMultiple: options.multiple ?? null,
    }),
  };

  const legalEntityModel = () => ({
    query: () => ({
      orderBy() {
        return this;
      },
      first: async () =>
        options.primary === undefined ? { ownershipShare: 100 } : options.primary,
    }),
  });

  return new GetCapitalizationService(
    balanceSheet as any,
    rollup as any,
    settings as any,
    legalEntityModel as any,
  );
};

/** Баланс с заданными активами и обязательствами. */
const balanceWith = (assets: number, liabilities: number) => [
  { id: 'ASSETS', total: { amount: assets } },
  {
    id: 'LIABILITY_EQUITY',
    total: { amount: assets },
    children: [{ id: 'LIABILITY', total: { amount: liabilities } }],
  },
];

/** Строки свёртки, дающие нужную прибыль. */
const rowsWithProfit = (revenue: number, expense: number) => [
  { id: 1, name: 'Выручка', kind: 'income', amount: revenue },
  { id: 2, name: 'Расходы', kind: 'expense', amount: expense },
];

describe('GetCapitalizationService', () => {
  it('чистые активы — это активы минус обязательства', async () => {
    const service = buildService({ balanceNodes: balanceWith(1_000_000, 300_000) });

    const result = await service.getCapitalization({});

    expect(result.netAssets).toBe(700_000);
    expect(result.hasBalance).toBe(true);
  });

  it('отрицательные чистые активы показываются, а не прячутся', async () => {
    // Долгов больше, чем имущества, — это важный сигнал, а не ошибка.
    const service = buildService({ balanceNodes: balanceWith(100_000, 400_000) });

    const result = await service.getCapitalization({});

    expect(result.netAssets).toBe(-300_000);
  });

  it('без настроенного множителя оценки по прибыли НЕТ', async () => {
    // Подставить «обычно 4» значило бы дать совет от лица продукта.
    const service = buildService({
      balanceNodes: balanceWith(500_000, 0),
      rows: rowsWithProfit(1_000_000, 400_000),
      multiple: null,
    });

    const result = await service.getCapitalization({});

    expect(result.multipleValuation.applicable).toBe(false);
    expect(result.profitMultiple).toBeNull();
  });

  it('убыточный бизнес по мультипликатору не оценивается', async () => {
    // Прибыль −2 млн на множитель 4 даёт «стоимость −8 млн» — число,
    // которое выглядит как расчёт, но смысла не имеет.
    const service = buildService({
      balanceNodes: balanceWith(500_000, 0),
      rows: rowsWithProfit(1_000_000, 3_000_000),
      multiple: 4,
    });

    const result = await service.getCapitalization({});

    expect(result.profit).toBeLessThan(0);
    expect(result.multipleValuation.applicable).toBe(false);
  });

  it('доля владельца считается от ПРИМЕНИМОЙ оценки', async () => {
    // Когда мультипликатор посчитать нельзя, берём чистые активы: показать
    // долю от нуля значило бы сказать «ваша доля стоит 0 ₽» там, где оценки
    // просто нет.
    const service = buildService({
      balanceNodes: balanceWith(1_000_000, 200_000),
      rows: rowsWithProfit(0, 0),
      multiple: null,
      primary: { ownershipShare: 50 },
    });

    const result = await service.getCapitalization({});

    expect(result.ownerValue.applicable).toBe(true);
    expect(result.ownerValue.value).toBe(400_000);
  });

  it('пустой справочник юрлиц — доля НЕИЗВЕСТНА, а не ноль', async () => {
    const service = buildService({
      balanceNodes: balanceWith(1_000_000, 0),
      primary: null,
    });

    const result = await service.getCapitalization({});

    expect(result.ownershipSharePercent).toBeNull();
    expect(result.ownerValue.applicable).toBe(false);
  });

  it('организация без единой проводки — не «нулевая стоимость»', async () => {
    const service = buildService({ balanceNodes: [] });

    const result = await service.getCapitalization({});

    expect(result.hasBalance).toBe(false);
  });

  it('период по умолчанию — с начала года по сегодня', async () => {
    const service = buildService({ balanceNodes: balanceWith(1, 0) });

    const result = await service.getCapitalization({});

    expect(result.fromDate).toMatch(/^\d{4}-01-01$/);
    expect(result.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
