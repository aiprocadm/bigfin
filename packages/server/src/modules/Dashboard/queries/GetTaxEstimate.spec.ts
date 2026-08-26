// © 2026 Bigfin
import { GetTaxEstimateService } from './GetTaxEstimate.service';
import { TaxRegime } from '@/modules/RussianLegalAttributes/constants';

/**
 * Н3 карты v22 — оценка налога берёт цифры из того же отчёта, что показывает
 * раздел «Прибыли и убытки», и только по кассовому методу.
 */
const buildService = ({
  regime = TaxRegime.USN_INCOME,
  report = {
    data: [
      { id: 'INCOME', total: { amount: 1_000_000 } },
      { id: 'COST_OF_SALES', total: { amount: 300_000 } },
      { id: 'EXPENSES', total: { amount: 100_000 } },
    ],
  },
  reportThrows = false,
}: any = {}) => {
  const calls: any[] = [];
  const service = new GetTaxEstimateService(
    {
      profitLossSheet: async (query: any) => {
        calls.push(query);
        if (reportThrows) throw new Error('отчёт недоступен');
        return report;
      },
    } as any,
    {
      // null, а не отсутствие поля: значение по умолчанию у заглушки
      // перекрыло бы `undefined` и тест бы врал.
      getTenantMetadata: async () =>
        regime === null ? {} : { taxRegime: regime },
    } as any,
  );

  return { service, calls };
};

describe('оценка налога для сводки', () => {
  it('на «Доходах» считает 6 % от выручки отчёта', async () => {
    const { service } = buildService();

    const result = await service.getTaxEstimate('2026-08-26');

    // 1 000 000 доходов (расходы на этом режиме не уменьшают налог).
    expect(result?.amount).toBe(60_000);
  });

  it('на «Доходах минус расходах» вычитает расходы отчёта', async () => {
    const { service } = buildService({ regime: TaxRegime.USN_INCOME_EXPENSE });

    const result = await service.getTaxEstimate('2026-08-26');

    // 1 000 000 − (300 000 + 100 000) = 600 000; 15 % = 90 000.
    expect(result?.base).toBe(600_000);
    expect(result?.amount).toBe(90_000);
  });

  it('спрашивает отчёт по кассовому методу за текущий квартал', async () => {
    const { service, calls } = buildService();

    await service.getTaxEstimate('2026-08-26');

    expect(calls[0].basis).toBe('cash');
    expect(calls[0].fromDate).toBe('2026-07-01');
    expect(calls[0].toDate).toBe('2026-09-30');
  });

  it('не на упрощёнке — отчёт даже не строится', async () => {
    const { service, calls } = buildService({ regime: TaxRegime.OSNO });

    const result = await service.getTaxEstimate('2026-08-26');

    expect(result).toBeNull();
    expect(calls).toEqual([]);
  });

  it('режим не задан — оценки нет', async () => {
    const { service } = buildService({ regime: null });

    await expect(service.getTaxEstimate('2026-08-26')).resolves.toBeNull();
  });

  it('сбой отчёта не роняет главную — просто нет оценки', async () => {
    const { service } = buildService({ reportThrows: true });

    await expect(service.getTaxEstimate('2026-08-26')).resolves.toBeNull();
  });

  it('пустой отчёт даёт нулевой налог, а не ошибку', async () => {
    const { service } = buildService({ report: { data: [] } });

    const result = await service.getTaxEstimate('2026-08-26');

    expect(result?.amount).toBe(0);
  });

  it('прочие доходы тоже попадают в базу', async () => {
    const { service } = buildService({
      report: {
        data: [
          { id: 'INCOME', total: { amount: 100_000 } },
          { id: 'OTHER_INCOME', total: { amount: 50_000 } },
        ],
      },
    });

    const result = await service.getTaxEstimate('2026-08-26');

    expect(result?.base).toBe(150_000);
  });
});
