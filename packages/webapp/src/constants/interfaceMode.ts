import type React from 'react';

export const INTERFACE_MODE = {
  Business: 'business',
  Accountant: 'accountant',
} as const;

export type InterfaceModeValue =
  (typeof INTERFACE_MODE)[keyof typeof INTERFACE_MODE];

/**
 * Базовые пути экранов, скрываемых в режиме «Бизнес»
 * (чисто-бухгалтерские: проводки, книги, ОСВ, закрытие периодов).
 */
export const ACCOUNTANT_ONLY_ROUTE_BASES = [
  '/manual-journals',
  '/make-journal-entry',
  '/transactions-locking',
  '/financial-reports/general-ledger',
  '/financial-reports/trial-balance-sheet',
  '/financial-reports/journal-sheet',
];

/**
 * Прятать ли accountant-only экраны.
 * Прячем только когда фича включена И режим = business.
 */
export function isAccountantOnlyHidden(
  mode: string | undefined,
  isFeatureOn: boolean,
): boolean {
  return !!isFeatureOn && mode === INTERFACE_MODE.Business;
}

/**
 * Является ли путь accountant-only (учитывает вложенные пути вроде /import).
 */
export function isAccountantOnlyPath(pathname: string): boolean {
  return ACCOUNTANT_ONLY_ROUTE_BASES.some(
    (base) => pathname === base || pathname.startsWith(base + '/'),
  );
}

/**
 * Показать ли объяснение вместо содержимого экрана.
 *
 * Р2 карты v40. Раньше на скрытых экранах адрес молча подменялся на `/`:
 * человек нажимал ссылку и оказывался на главной без единого слова.
 * Правило продукта — «выключенный раздел объясняет себя» (карта v36).
 */
export function shouldExplainAccountantOnly(
  mode: string | undefined,
  isFeatureOn: boolean,
  pathname: string,
): boolean {
  return isAccountantOnlyHidden(mode, isFeatureOn) && isAccountantOnlyPath(pathname);
}

/** Адрес ссылки меню: без параметров запроса и с ведущей косой. */
function linkPathname(link: string): string {
  const path = String(link).split('?')[0].split('#')[0];
  return path.startsWith('/') ? path : `/${path}`;
}

interface ReportsSection<TReport extends { link: string }> {
  /** Заголовок секции («Финансовый учёт», «Налоги» и т. д.). */
  sectionTitle: React.ReactNode;
  reports: TReport[];
}

/**
 * Р1 карты v40. Раздел отчётов не предлагает того, чего не откроет.
 *
 * Боковое меню accountant-only пункты прячет (карта v34), а экран «Все
 * отчёты» их по-прежнему показывал — три карточки уводили на главную.
 * Секция, где после отсева не осталось отчётов, не показывается пустой.
 */
export function filterAccountantOnlyReports<
  TReport extends { link: string },
  TSection extends ReportsSection<TReport>,
>(sections: TSection[], hidden: boolean): TSection[] {
  if (!hidden) return sections;

  return sections
    .map((section) => ({
      ...section,
      reports: section.reports.filter(
        (report) => !isAccountantOnlyPath(linkPathname(report.link)),
      ),
    }))
    .filter((section) => section.reports.length > 0);
}
