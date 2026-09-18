import { describe, it, expect } from 'vitest';

import {
  MAIN_REPORTS,
  MAIN_REPORT_LINKS,
  withoutMainReports,
} from './mainReports';

/**
 * Этап 4 ТЗ, п. 4.1. Раздел отчётов открывается тремя карточками.
 *
 * Главное, что здесь легко сломать: показать один и тот же отчёт дважды —
 * крупной карточкой сверху и строкой в списке ниже. Человек начинает гадать,
 * есть ли между ними разница.
 */
const sections = [
  {
    sectionTitle: 'Финансовый учёт',
    reports: [
      { link: '/financial-reports/cash-flow' },
      { link: '/financial-reports/profit-loss-sheet' },
      { link: '/financial-reports/balance-sheet' },
      { link: '/financial-reports/general-ledger' },
    ],
  },
  {
    sectionTitle: 'Только главные',
    reports: [{ link: '/financial-reports/balance-sheet' }],
  },
];

describe('вход в раздел отчётов', () => {
  it('главных отчётов ровно три', () => {
    expect(MAIN_REPORTS).toHaveLength(3);
    expect(MAIN_REPORT_LINKS).toEqual([
      '/financial-reports/cash-flow',
      '/financial-reports/profit-loss-sheet',
      '/financial-reports/balance-sheet',
    ]);
  });

  it('у каждой карточки есть название и подпись', () => {
    // Карточка без подписи не отвечает на вопрос «зачем мне этот отчёт».
    MAIN_REPORTS.forEach((report) => {
      expect(report.titleKey).toBeTruthy();
      expect(report.descriptionKey).toBeTruthy();
      expect(report.link.startsWith('/financial-reports/')).toBe(true);
    });
  });

  it('главные отчёты не дублируются в списке ниже', () => {
    const rest = withoutMainReports(sections);

    expect(rest[0].reports.map((r) => r.link)).toEqual([
      '/financial-reports/general-ledger',
    ]);
  });

  it('опустевшая группа не показывается', () => {
    // В группе были только главные отчёты — показывать пустой заголовок
    // незачем.
    expect(withoutMainReports(sections)).toHaveLength(1);
  });

  it('список без главных отчётов не трогается', () => {
    const other = [
      { sectionTitle: 'Налоги', reports: [{ link: '/financial-reports/vat' }] },
    ];

    expect(withoutMainReports(other)).toEqual(other);
  });
});
