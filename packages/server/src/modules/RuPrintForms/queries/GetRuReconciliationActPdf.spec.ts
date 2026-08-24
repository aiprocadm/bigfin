// © 2026 Bigfin
import { GetRuReconciliationActPdf } from './GetRuReconciliationActPdf.service';

/**
 * К2 карты v19: акт сверки взаимных расчётов. Обороты берутся из того же
 * отчёта, что показывает раздел «Обороты по покупателю» — иначе в продукте
 * появилось бы два расходящихся способа считать сальдо.
 */
const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  kpp: '770701001',
  addressTextFormatted: 'г. Москва, ул. Ленина, д. 1',
  signerDirectorName: 'Соколова И. П.',
  signerDirectorPosition: 'Генеральный директор',
};

const buildService = ({ report }: { report: any }) => {
  const transactionsByCustomers = {
    transactionsByCustomers: jest.fn().mockResolvedValue({
      data: report ? [report] : [],
    }),
  };
  const customerModel = () => ({
    query: () => ({
      findById: () => ({
        throwIfNotFound: async () => ({
          displayName: 'ООО «Северный ветер»',
          inn: '7801234567',
          kpp: '780101001',
        }),
      }),
    }),
  });

  const service = new GetRuReconciliationActPdf(
    {} as any,
    { getTenant: async () => ({ metadata }) } as any,
    transactionsByCustomers as any,
    customerModel as any,
  );
  return { service, transactionsByCustomers };
};

const period = { fromDate: '2026-07-01', toDate: '2026-09-30' };

const report = {
  customerName: 'ООО «Северный ветер»',
  openingBalance: { amount: 10000 },
  closingBalance: { amount: 53000 },
  transactions: [
    {
      date: '2026-07-12',
      transactionType: 'Счёт',
      transactionNumber: 'INV-00007',
      debit: { amount: 18000 },
      credit: { amount: 0 },
    },
    {
      date: '2026-08-03',
      transactionType: 'Платёж',
      transactionNumber: 'PAY-0001',
      debit: { amount: 0 },
      credit: { amount: 5000 },
    },
    {
      date: '2026-09-01',
      transactionType: 'Счёт',
      transactionNumber: 'INV-00008',
      debit: { amount: 30000 },
      credit: { amount: 0 },
    },
  ],
};

describe('акт сверки взаимных расчётов', () => {
  it('стороны берутся из реквизитов организации и контрагента', async () => {
    const { service } = buildService({ report });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.organizationLine).toContain('ООО «Ромашка»');
    expect(props.organizationLine).toContain('ИНН 7707083893');
    expect(props.counterpartyLine).toContain('ООО «Северный ветер»');
    expect(props.counterpartyLine).toContain('ИНН 7801234567');
  });

  it('подписанты приходят из реквизитов (механизм v17)', async () => {
    const { service } = buildService({ report });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.signerDirectorName).toBe('Соколова И. П.');
    expect(props.signerDirectorPosition).toBe('Генеральный директор');
  });

  it('обороты складываются, сальдо приходят из отчёта', async () => {
    const { service } = buildService({ report });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.lines).toHaveLength(3);
    expect(props.openingBalance).toBe('10 000,00');
    // 18 000 + 30 000 по дебету, 5 000 по кредиту.
    expect(props.totalDebit).toBe('48 000,00');
    expect(props.totalCredit).toBe('5 000,00');
    expect(props.closingBalance).toBe('53 000,00');
  });

  it('пояснение говорит, кто кому должен', async () => {
    const { service } = buildService({ report });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.closingBalanceText).toContain('задолженность контрагента');
    expect(props.closingBalanceInWords).toContain('тысячи');
  });

  it('долг организации перед контрагентом читается наоборот', async () => {
    const { service } = buildService({
      report: { ...report, closingBalance: { amount: -4000 } },
    });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.closingBalanceText).toContain('задолженность организации');
    // Сумма прописью — по модулю: «минус четыре тысячи» в акте не пишут.
    expect(props.closingBalanceInWords).not.toContain('минус');
  });

  it('пустой период не падает и говорит «задолженности нет»', async () => {
    const { service } = buildService({
      report: {
        openingBalance: { amount: 0 },
        closingBalance: { amount: 0 },
        transactions: [],
      },
    });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.lines).toEqual([]);
    expect(props.totalDebit).toBe('0,00');
    expect(props.closingBalanceText).toContain('задолженность отсутствует');
    expect(props.closingBalanceInWords).toBe('');
  });

  it('контрагент без единой операции всё равно попадает в акт', async () => {
    // «Сверились и разошлись в ноль» — законный итог сверки, поэтому
    // отчёт запрашивается без отсева пустых.
    const { service, transactionsByCustomers } = buildService({ report: null });

    const props = await service.getReconciliationActProps(5, period);

    const [query] = transactionsByCustomers.transactionsByCustomers.mock.calls[0];
    expect(query.noneTransactions).toBe(false);
    expect(query.noneZero).toBe(false);
    expect(query.customersIds).toEqual([5]);
    expect(props.lines).toEqual([]);
  });

  it('период показан русскими датами с точками', async () => {
    const { service } = buildService({ report });

    const props = await service.getReconciliationActProps(5, period);

    expect(props.periodLabel).toBe('01.07.2026 — 30.09.2026');
  });
});
