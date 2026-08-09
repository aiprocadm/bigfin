// © 2026 Bigfin
import {
  buildDocumentPnlShape,
  DocumentPnlShape,
  recognizeSettledPnlLegs,
} from './recognizeSettledPnlLegs';

const AR = 100;
const INCOME = 200;
const INCOME_2 = 201;
const TAX = 300;
const AP = 400;
const EXPENSE = 500;
const INVENTORY = 600;

const isAR = (id: number) => id === AR;
const isAP = (id: number) => id === AP;
const isIncome = (id: number) => id === INCOME || id === INCOME_2;
const isExpense = (id: number) => id === EXPENSE;

const leg = (accountId: number, credit: number, debit: number) => ({
  referenceType: 'SaleInvoice',
  referenceId: 1,
  accountId,
  credit,
  debit,
  date: '2026-01-10',
});

describe('buildDocumentPnlShape — разбор оплачиваемого документа', () => {
  it('счёт покупателю: долг — дебиторка, доход — счета выручки', () => {
    // Счёт на 100 000 + НДС 20 000.
    const shape = buildDocumentPnlShape(
      [leg(AR, 0, 120000), leg(INCOME, 100000, 0), leg(TAX, 20000, 0)],
      isAR,
      isIncome,
      'credit',
    );

    expect(shape).toEqual({
      settledTotal: 120000,
      byAccount: { [INCOME]: 100000 },
      direction: 'credit',
    });
  });

  it('счёт поставщика: долг — кредиторка, расход — счета расходов', () => {
    const shape = buildDocumentPnlShape(
      [leg(AP, 60000, 0), leg(EXPENSE, 0, 50000), leg(TAX, 0, 10000)],
      isAP,
      isExpense,
      'debit',
    );

    expect(shape).toEqual({
      settledTotal: 60000,
      byAccount: { [EXPENSE]: 50000 },
      direction: 'debit',
    });
  });

  it('закупка товара на склад расхода не даёт', () => {
    // Склад — не счёт расходов: расход появится при продаже.
    const shape = buildDocumentPnlShape(
      [leg(AP, 60000, 0), leg(INVENTORY, 0, 50000), leg(TAX, 0, 10000)],
      isAP,
      isExpense,
      'debit',
    );

    expect(shape.byAccount).toEqual({});
    expect(shape.settledTotal).toBe(60000);
  });

  it('несколько счетов выручки разносятся по отдельности', () => {
    const shape = buildDocumentPnlShape(
      [leg(AR, 0, 90000), leg(INCOME, 60000, 0), leg(INCOME_2, 30000, 0)],
      isAR,
      isIncome,
      'credit',
    );

    expect(shape.byAccount).toEqual({ [INCOME]: 60000, [INCOME_2]: 30000 });
  });

  it('строки, ушедшие в ноль, в разбор не попадают', () => {
    const shape = buildDocumentPnlShape(
      [leg(AR, 0, 10000), leg(INCOME, 10000, 10000)],
      isAR,
      isIncome,
      'credit',
    );

    expect(shape.byAccount).toEqual({});
  });
});

describe('recognizeSettledPnlLegs — доход по факту оплаты', () => {
  const invoiceShape: DocumentPnlShape = {
    settledTotal: 120000,
    byAccount: { [INCOME]: 100000 },
    direction: 'credit',
  };
  const shapes = new Map([['SaleInvoice:1', invoiceShape]]);

  const settlement = (amount: number, date = '2026-03-05') => ({
    paymentReferenceType: 'PaymentReceive',
    paymentReferenceId: 7,
    date,
    documentReferenceType: 'SaleInvoice',
    documentReferenceId: 1,
    amount,
  });

  it('полная оплата признаёт всю выручку, без налога', () => {
    // Заплатили 120 000, из них 20 000 — НДС: доход 100 000.
    const legs = recognizeSettledPnlLegs([settlement(120000)], shapes);

    expect(legs).toEqual([
      {
        referenceType: 'PaymentReceive',
        referenceId: 7,
        accountId: INCOME,
        date: '2026-03-05',
        credit: 100000,
        debit: 0,
      },
    ]);
  });

  it('половина оплаты — половина выручки', () => {
    const legs = recognizeSettledPnlLegs([settlement(60000)], shapes);

    expect(legs[0].credit).toBe(50000);
  });

  it('доход попадает в дату платежа, а не счёта', () => {
    const legs = recognizeSettledPnlLegs([settlement(120000, '2026-07-20')], shapes);

    expect(legs[0].date).toBe('2026-07-20');
  });

  it('переплата не создаёт выручки больше, чем в счёте', () => {
    const legs = recognizeSettledPnlLegs([settlement(200000)], shapes);

    expect(legs[0].credit).toBe(100000);
  });

  it('два платежа по одному счёту складываются', () => {
    const legs = recognizeSettledPnlLegs(
      [settlement(60000, '2026-03-05'), settlement(60000, '2026-04-05')],
      shapes,
    );

    expect(legs.map((l) => l.credit)).toEqual([50000, 50000]);
    expect(legs.map((l) => l.date)).toEqual(['2026-03-05', '2026-04-05']);
  });

  it('расход по оплате поставщику пишется в дебет', () => {
    const billShapes = new Map([
      [
        'Bill:2',
        {
          settledTotal: 60000,
          byAccount: { [EXPENSE]: 50000 },
          direction: 'debit' as const,
        },
      ],
    ]);
    const legs = recognizeSettledPnlLegs(
      [
        {
          paymentReferenceType: 'BillPayment',
          paymentReferenceId: 3,
          date: '2026-03-05',
          documentReferenceType: 'Bill',
          documentReferenceId: 2,
          amount: 30000,
        },
      ],
      billShapes,
    );

    expect(legs[0]).toMatchObject({ debit: 25000, credit: 0 });
  });

  it('неизвестный документ и нулевые суммы пропускаются', () => {
    const legs = recognizeSettledPnlLegs(
      [
        { ...settlement(0) },
        {
          ...settlement(100),
          documentReferenceType: 'SaleInvoice',
          documentReferenceId: 999,
        },
      ],
      shapes,
    );

    expect(legs).toEqual([]);
  });

  it('документ без долга не делится на ноль', () => {
    const zeroShapes = new Map([
      [
        'SaleInvoice:1',
        { settledTotal: 0, byAccount: { [INCOME]: 100 }, direction: 'credit' as const },
      ],
    ]);

    expect(recognizeSettledPnlLegs([settlement(500)], zeroShapes)).toEqual([]);
  });

  it('копейки округляются до копеек', () => {
    const oddShapes = new Map([
      [
        'SaleInvoice:1',
        {
          settledTotal: 3,
          byAccount: { [INCOME]: 10 },
          direction: 'credit' as const,
        },
      ],
    ]);
    const legs = recognizeSettledPnlLegs([settlement(1)], oddShapes);

    expect(legs[0].credit).toBe(3.33);
  });
});
