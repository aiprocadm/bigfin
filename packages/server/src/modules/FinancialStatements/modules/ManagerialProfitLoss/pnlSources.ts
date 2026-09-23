// © 2026 Bigfin

/**
 * Источники данных управленческого ОПиУ (FT-012 ТЗ-3): какие модули его
 * питают.
 *
 * Выключенный модуль НЕ УДАЛЯЕТ проводки — отчёт просто перестаёт их
 * читать. Это нужно тем, кто ведёт, например, амортизацию в модуле
 * «Основные средства», но в управленческом отчёте хочет видеть её иначе —
 * своей операцией. Все тумблеры включены — отчёт тот же, что без них.
 *
 * ЗАРПЛАТА И НАЛОГИ В ЖУРНАЛ НЕ ПИШУТ: ведомость создаёт только плановые
 * платежи, и в прибыль расходы на зарплату попадают из операций оплаты.
 * Поэтому у этих источников нет своих видов документов — тумблер ничего не
 * отключает, и экран говорит об этом прямо, а не показывает пустую кнопку.
 */
export const PNL_SOURCES = {
  /** Денежные операции и расходы. */
  operations: ['CashflowTransaction', 'Expense', 'Journal'],
  /** Продажи и закупки: счета, чеки, возвраты, списания. */
  deals: [
    'SaleInvoice',
    'SaleReceipt',
    'CreditNote',
    'RefundCreditNote',
    'InvoiceWriteOff',
    'Bill',
    'VendorCredit',
    'RefundVendorCredit',
    'LandedCost',
  ],
  payroll: [] as string[],
  credits: ['CreditDisbursement', 'CreditInstallmentPayment'],
  fixed_assets: ['FixedAssetDepreciation', 'FixedAssetDisposal'],
  taxes: [] as string[],
} as const;

export type PnlSourceKey = keyof typeof PNL_SOURCES;

export const PNL_SOURCE_KEYS = Object.keys(PNL_SOURCES) as PnlSourceKey[];

/** Хранилище настроек в той мере, в какой оно нужно здесь. */
interface SettingsReader {
  get(query: { group: string; key: string }, defaultValue?: any): any;
}

const isOff = (value: unknown) =>
  value === false || ['0', 'false', 'no'].includes(String(value).toLowerCase());

/** Какие источники включены. Не настроено — все. */
export function readPnlSources(store: SettingsReader | null | undefined) {
  const result = {} as Record<PnlSourceKey, boolean>;
  PNL_SOURCE_KEYS.forEach((key) => {
    const value = store?.get({ group: 'pnl_sources', key });
    result[key] = value === undefined || value === null || value === '' ? true : !isOff(value);
  });
  return result;
}

/** Виды документов, которые отчёт НЕ читает при таких настройках. */
export function excludedReferenceTypes(
  sources: Record<PnlSourceKey, boolean>,
): Set<string> {
  const excluded = new Set<string>();
  PNL_SOURCE_KEYS.forEach((key) => {
    if (!sources[key]) PNL_SOURCES[key].forEach((type) => excluded.add(type));
  });
  return excluded;
}
