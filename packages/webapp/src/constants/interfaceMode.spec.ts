import {
  INTERFACE_MODE,
  isAccountantOnlyHidden,
  isAccountantOnlyPath,
  shouldExplainAccountantOnly,
  filterAccountantOnlyReports,
} from './interfaceMode';

describe('isAccountantOnlyHidden', () => {
  it('флаг выключен → не прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Business, false)).toBe(false);
  });
  it('флаг включён + режим business → прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Business, true)).toBe(true);
  });
  it('флаг включён + режим accountant → не прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Accountant, true)).toBe(false);
  });
});

describe('isAccountantOnlyPath', () => {
  it.each([
    '/manual-journals',
    '/manual-journals/import',
    '/manual-journals/5/edit',
    '/make-journal-entry',
    '/transactions-locking',
    '/financial-reports/general-ledger',
    '/financial-reports/trial-balance-sheet',
    '/financial-reports/journal-sheet',
  ])('accountant-only: %s', (p) => {
    expect(isAccountantOnlyPath(p)).toBe(true);
  });

  it.each([
    '/',
    '/invoices',
    '/financial-reports/balance-sheet',
    '/accounts',
    '/tax-rates',
  ])('обычный: %s', (p) => {
    expect(isAccountantOnlyPath(p)).toBe(false);
  });
});

describe('shouldExplainAccountantOnly', () => {
  it('режим business + accountant-only адрес → объясняем', () => {
    expect(
      shouldExplainAccountantOnly(
        INTERFACE_MODE.Business,
        true,
        '/financial-reports/general-ledger',
      ),
    ).toBe(true);
  });

  it('обычный адрес → не объясняем', () => {
    expect(
      shouldExplainAccountantOnly(INTERFACE_MODE.Business, true, '/invoices'),
    ).toBe(false);
  });

  it('режим accountant → не объясняем, экран открыт', () => {
    expect(
      shouldExplainAccountantOnly(
        INTERFACE_MODE.Accountant,
        true,
        '/manual-journals',
      ),
    ).toBe(false);
  });

  it('флаг выключен → не объясняем', () => {
    expect(
      shouldExplainAccountantOnly(
        INTERFACE_MODE.Business,
        false,
        '/manual-journals',
      ),
    ).toBe(false);
  });
});

describe('filterAccountantOnlyReports', () => {
  const sections = [
    {
      sectionTitle: 'Финансовый учёт',
      reports: [
        { link: '/financial-reports/balance-sheet' },
        { link: '/financial-reports/trial-balance-sheet' },
        { link: '/financial-reports/journal-sheet' },
        { link: '/financial-reports/general-ledger' },
      ],
    },
    {
      sectionTitle: 'Только бухгалтерские',
      reports: [{ link: '/financial-reports/journal-sheet' }],
    },
  ];

  it('режим business → бухгалтерские отчёты не предлагаются', () => {
    const [first] = filterAccountantOnlyReports(sections, true);

    expect(first.reports.map((r) => r.link)).toEqual([
      '/financial-reports/balance-sheet',
    ]);
  });

  it('секция, где не осталось ни одного отчёта, не показывается пустой', () => {
    expect(filterAccountantOnlyReports(sections, true)).toHaveLength(1);
  });

  it('режим accountant → список не тронут', () => {
    expect(filterAccountantOnlyReports(sections, false)).toEqual(sections);
  });

  it('ссылка с параметрами и без ведущей косой разбирается как адрес', () => {
    const withQuery = [
      {
        sectionTitle: 'Сравнение',
        reports: [
          { link: 'financial-reports/trial-balance-sheet?previousYear=true' },
          { link: 'financial-reports/balance-sheet?previousYear=true' },
        ],
      },
    ];

    expect(filterAccountantOnlyReports(withQuery, true)[0].reports).toEqual([
      { link: 'financial-reports/balance-sheet?previousYear=true' },
    ]);
  });
});
