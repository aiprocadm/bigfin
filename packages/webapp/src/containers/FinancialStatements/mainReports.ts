/**
 * Три главных отчёта продукта (этап 4 ТЗ, п. 4.1).
 *
 * Раздел открывается не списком из двадцати позиций, а тремя большими
 * карточками: они отвечают на три вопроса, ради которых собственник вообще
 * заходит в отчёты (ЧАСТЬ A5 ТЗ).
 *
 * Остальные отчёты никуда не деваются — они ниже, свёрнутым списком с
 * группировкой. Здесь только выделение главных, без изменения состава.
 */
export interface MainReport {
  /** Ключ перевода названия. */
  titleKey: string;
  /** Ключ перевода подписи: зачем этот отчёт человеку. */
  descriptionKey: string;
  link: string;
}

export const MAIN_REPORTS: MainReport[] = [
  {
    titleKey: 'reports.main.cash_flow.title',
    descriptionKey: 'reports.main.cash_flow.description',
    link: '/financial-reports/cash-flow',
  },
  {
    titleKey: 'reports.main.profit_loss.title',
    descriptionKey: 'reports.main.profit_loss.description',
    link: '/financial-reports/profit-loss-sheet',
  },
  {
    titleKey: 'reports.main.balance_sheet.title',
    descriptionKey: 'reports.main.balance_sheet.description',
    link: '/financial-reports/balance-sheet',
  },
];

/** Адреса главных отчётов — по ним они убираются из списка «Другие». */
export const MAIN_REPORT_LINKS = MAIN_REPORTS.map((report) => report.link);

/**
 * Убирает главные отчёты из общего списка и выбрасывает опустевшие группы.
 *
 * Показывать «Деньги (ДДС)» и сверху крупной карточкой, и ниже в списке —
 * значит заставлять человека гадать, есть ли между ними разница.
 */
export const withoutMainReports = <
  TReport extends { link: string },
  TSection extends { reports: TReport[] },
>(
  sections: TSection[],
): TSection[] =>
  sections
    .map((section) => ({
      ...section,
      reports: section.reports.filter(
        (report) => !MAIN_REPORT_LINKS.includes(report.link),
      ),
    }))
    .filter((section) => section.reports.length > 0);
