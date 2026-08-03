import { Ledger } from './Ledger';

/**
 * Ядро двойной записи (㉔): сальдо считается по «нормали» счёта — для
 * активных счетов сальдо = дебет − кредит, для пассивных наоборот. Ошибка
 * здесь искажает любой отчёт, а тестов на класс не было.
 */
const entry = (over: Record<string, any> = {}) => ({
  date: '2026-06-15',
  credit: 0,
  debit: 0,
  accountId: 1,
  accountNormal: 'debit',
  contactId: null,
  currencyCode: 'RUB',
  exchangeRate: 1,
  branchId: null,
  projectId: null,
  itemId: null,
  index: 1,
  ...over,
});

describe('Ledger — сальдо по нормали счёта', () => {
  it('активный счёт: сальдо = дебет − кредит', () => {
    const ledger = new Ledger([
      entry({ accountNormal: 'debit', debit: 1000 }),
      entry({ accountNormal: 'debit', credit: 300 }),
    ] as any);

    expect(ledger.getClosingBalance()).toBe(700);
  });

  it('пассивный счёт: сальдо = кредит − дебет', () => {
    const ledger = new Ledger([
      entry({ accountNormal: 'credit', credit: 1000 }),
      entry({ accountNormal: 'credit', debit: 300 }),
    ] as any);

    expect(ledger.getClosingBalance()).toBe(700);
  });

  it('записи без нормали счёта в сальдо не попадают', () => {
    const ledger = new Ledger([
      entry({ accountNormal: 'debit', debit: 500 }),
      entry({ accountNormal: null, debit: 999 }),
    ] as any);

    expect(ledger.getClosingBalance()).toBe(500);
  });

  it('обороты по дебету и кредиту считаются независимо от нормали', () => {
    const ledger = new Ledger([
      entry({ accountNormal: 'debit', debit: 1000 }),
      entry({ accountNormal: 'credit', credit: 400 }),
      entry({ accountNormal: 'debit', credit: 100 }),
    ] as any);

    expect(ledger.getClosingDebit()).toBe(1000);
    expect(ledger.getClosingCredit()).toBe(500);
  });

  it('пустая книга — нулевое сальдо', () => {
    const ledger = new Ledger([] as any);

    expect(ledger.getClosingBalance()).toBe(0);
    expect(ledger.isEmpty()).toBe(true);
  });
});

describe('Ledger — сальдо в валюте операции', () => {
  it('делит суммы на курс', () => {
    // 9000 ₽ по курсу 90 — это 100 в валюте операции.
    const ledger = new Ledger([
      entry({ accountNormal: 'debit', debit: 9000, exchangeRate: 90 }),
    ] as any);

    expect(ledger.getForeignClosingBalance()).toBe(100);
  });

  it('без курса считает как есть (курс 1)', () => {
    const ledger = new Ledger([
      entry({ accountNormal: 'debit', debit: 500, exchangeRate: null }),
    ] as any);

    expect(ledger.getForeignClosingBalance()).toBe(500);
  });

  it('операции с разными курсами складываются каждая по своему', () => {
    const ledger = new Ledger([
      entry({ accountNormal: 'debit', debit: 9000, exchangeRate: 90 }),
      entry({ accountNormal: 'debit', debit: 200, exchangeRate: 1 }),
    ] as any);

    expect(ledger.getForeignClosingBalance()).toBe(300);
  });
});

describe('Ledger — отбор записей', () => {
  const ledger = new Ledger([
    entry({ accountId: 1, contactId: 10, debit: 100, branchId: 5, projectId: 7, itemId: 3 }),
    entry({ accountId: 2, contactId: 11, debit: 200, currencyCode: 'USD' }),
    entry({ accountId: 3, contactId: 10, debit: 300, date: '2026-01-01' }),
  ] as any);

  it('по счёту и по списку счетов', () => {
    expect(ledger.whereAccountId(2).getEntries()).toHaveLength(1);
    expect(ledger.whereAccountsIds([1, 3]).getEntries()).toHaveLength(2);
  });

  it('по контрагенту', () => {
    expect(ledger.whereContactId(10).getEntries()).toHaveLength(2);
    expect(ledger.whereContactId(999).getEntries()).toHaveLength(0);
  });

  it('по валюте, филиалу, проекту и товару', () => {
    expect(ledger.whereCurrencyCode('USD').getEntries()).toHaveLength(1);
    expect(ledger.whereBranch(5).getEntries()).toHaveLength(1);
    expect(ledger.whereProject(7).getEntries()).toHaveLength(1);
    expect(ledger.whereItem(3).getEntries()).toHaveLength(1);
  });

  it('по датам: границы периода включаются', () => {
    const fromJune = ledger.whereFromDate('2026-06-15');
    expect(fromJune.getEntries()).toHaveLength(2);

    const tillJanuary = ledger.whereToDate('2026-01-01');
    expect(tillJanuary.getEntries()).toHaveLength(1);
  });

  it('отбор не меняет исходную книгу', () => {
    ledger.whereAccountId(1);

    expect(ledger.getEntries()).toHaveLength(3);
  });

  it('отборы можно объединять в цепочку', () => {
    const result = ledger.whereContactId(10).whereAccountId(1);

    expect(result.getEntries()).toHaveLength(1);
    expect(result.getClosingBalance()).toBe(100);
  });
});

describe('Ledger — сводка по счетам', () => {
  it('возвращает список задействованных счетов без повторов', () => {
    const ledger = new Ledger([
      entry({ accountId: 1 }),
      entry({ accountId: 1 }),
      entry({ accountId: 2 }),
    ] as any);

    expect(ledger.getAccountsIds().sort()).toEqual([1, 2]);
  });
});
