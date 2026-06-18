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
