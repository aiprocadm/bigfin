export interface INumberFormatQuery {
  precision: number;
  divideOn1000: boolean;
  showZero: boolean;
  formatMoney: 'total' | 'always' | 'none';
  negativeFormat: 'parentheses' | 'mines';
}

export interface IFormatNumberSettings {
  precision?: number;
  divideOn1000?: boolean;
  excerptZero?: boolean;
  negativeFormat?: 'parentheses' | 'mines';
  thousand?: string;
  decimal?: string;
  zeroSign?: string;
  currencyCode?: string;
  money?: boolean;
}

export enum ReportsAction {
  READ_BALANCE_SHEET = 'read-balance-sheet',
  READ_TRIAL_BALANCE_SHEET = 'read-trial-balance-sheet',
  READ_PROFIT_LOSS = 'read-profit-loss',
  READ_JOURNAL = 'read-journal',
  READ_GENERAL_LEDGET = 'read-general-ledger',
  READ_CASHFLOW = 'read-cashflow',
  // Прямой ДДС по статьям — отдельное право от косвенного (D5 ТЗ-2):
  // бухгалтеру нужен косвенный, собственнику прямой, и это разные люди.
  READ_CASHFLOW_ARTICLES = 'read-cashflow-articles',
  READ_AR_AGING_SUMMARY = 'read-ar-aging-summary',
  READ_AP_AGING_SUMMARY = 'read-ap-aging-summary',
  READ_PURCHASES_BY_ITEMS = 'read-purchases-by-items',
  READ_SALES_BY_ITEMS = 'read-sales-by-items',
  READ_CUSTOMERS_TRANSACTIONS = 'read-customers-transactions',
  READ_VENDORS_TRANSACTIONS = 'read-vendors-transactions',
  READ_CUSTOMERS_SUMMARY_BALANCE = 'read-customers-summary-balance',
  READ_VENDORS_SUMMARY_BALANCE = 'read-vendors-summary-balance',
  READ_INVENTORY_VALUATION_SUMMARY = 'read-inventory-valuation-summary',
  READ_INVENTORY_ITEM_DETAILS = 'read-inventory-item-details',
  READ_CASHFLOW_ACCOUNT_TRANSACTION = 'read-cashflow-account-transactions',
  READ_PROJECT_PROFITABILITY_SUMMARY = 'read-project-profitability-summary',
  READ_SALES_TAX_LIABILITY_SUMMARY = 'read-sales-tax-liability-summary',
}

export interface IFinancialSheetBranchesQuery {
  branchesIds?: number[];

  /**
   * Разрез по юрлицам (этап 7 ТЗ, §7.1).
   *
   * Пусто или отсутствует — ВСЕ юрлица, то есть сводный отчёт по группе.
   * Именно так отчёт и вёл себя до появления разреза, поэтому у тех, кто
   * ничего не выбирал, ничего и не изменится.
   *
   * Отбор накладывается в одном месте на все отчёты: разные отчёты,
   * отбирающие по-разному, — это гарантированное расхождение цифр между
   * страницами.
   */
  legalEntityIds?: number[];
  /** Разрез по направлениям (остаток О6 ТЗ). Пусто — все операции. */
  projectsIds?: number[];
}

export interface IFinancialSheetCommonMeta {
  organizationName: string;
  baseCurrency: string;
  dateFormat: string;
  isCostComputeRunning: boolean;
  sheetName: string;

  /**
   * В какой валюте построен отчёт и есть ли в группе другие (§7.4).
   *
   * Пока юрлицо одно и валюта одна — вопрос не возникает. Как только в группе
   * появляется юрлицо с другой валютой учёта, сводная цифра без подписи
   * становится непонятной: рубли это или сумма несложимого.
   */
  groupCurrency?: {
    groupCurrency: string;
    isMultiCurrency: boolean;
    currencies: string[];
  };

  /**
   * Что именно показано: сводно по группе или по выбранным юрлицам.
   *
   * Человек должен ВИДЕТЬ это, а не гадать, почему сумма меньше, чем у него
   * в голове. Сводный отчёт без внутренних переводов и отчёт по одному
   * юрлицу дают разные числа — и оба правильные.
   */
  legalEntityScope?: {
    isConsolidated: boolean;
    excludesIntercompany: boolean;
    selectedCount: number;
  };
}

/**
 * Report meta interface for sheet constructors.
 * Combines baseCurrency and dateFormat for a cleaner API.
 */
export interface IFinancialReportMeta {
  baseCurrency: string;
  dateFormat: string;
}

/**
 * Default report meta values.
 */
export const DEFAULT_REPORT_META: Omit<IFinancialReportMeta, 'baseCurrency'> = {
  dateFormat: 'YYYY MMM DD',
};

export enum IFinancialDatePeriodsUnit {
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

export enum IAccountTransactionsGroupBy {
  Quarter = 'quarter',
  Year = 'year',
  Day = 'day',
  Month = 'month',
  Week = 'week',
}

export interface IDateRange {
  fromDate: Date;
  toDate: Date;
}

interface FinancialDateMeta {
  date: Date;
  formattedDate: string;
}

interface IFinancialSheetTotal {
  amount: number;
  formattedAmount: string;
  currencyCode: string;
}

interface IFinancialSheetPercentage {
  amount: number;
  formattedAmount: string;
}

/**
 * То, чему можно досчитать сравнение с прошлым периодом.
 *
 * Помощники из `FinancialPreviousPeriod` применяются и к узлам отчёта, и к
 * итогам колонок-периодов, и в трёх разных отчётах. В подписях у них стоял
 * узел одного конкретного отчёта («Прибыли и убытки»), хотя ничего кроме
 * итогов они не трогают. Здесь описано ровно то, что им и правда нужно.
 */
export interface IFinancialPreviousPeriodTarget {
  total?: { amount: number };
  previousPeriod?: { amount: number };
  previousPeriodChange?: { amount: number };
}

export interface IFinancialNodeWithPreviousPeriod {
  previousPeriodFromDate?: FinancialDateMeta;
  previousPeriodToDate?: FinancialDateMeta;

  previousPeriod?: IFinancialSheetTotal;
  previousPeriodChange?: IFinancialSheetTotal;
  previousPeriodPercentage?: IFinancialSheetPercentage;
}
export interface IFinancialNodeWithPreviousYear {
  /**
   * Даты прошлого года ПОЯВЛЯЮТСЯ ТОЛЬКО ПРИ ВКЛЮЧЁННОМ СРАВНЕНИИ.
   *
   * Раньше они были объявлены обязательными, и любой узел, собранный без
   * сравнения, считался неправильным. На самом деле неправ был перечень:
   * сравнение — это выключатель, а не часть каждого узла. Ровно так же
   * устроены поля прошлого периода строкой выше.
   */
  previousYearFromDate?: FinancialDateMeta;
  previousYearToDate?: FinancialDateMeta;

  previousYear?: IFinancialSheetTotal;
  previousYearChange?: IFinancialSheetTotal;
  previousYearPercentage?: IFinancialSheetPercentage;
}
export interface IFinancialCommonNode {
  total: IFinancialSheetTotal;

  // Дети ЕСТЬ у узлов отчётов — по ним и ходит фильтр
  // (`FinancialFilter.isNodeHasChildren`). В перечне их не было: он
  // просто отстал от кода, и пока файл стоял вне проверки типов, это
  // ничем себя не выдавало.
  children?: IFinancialCommonNode[];
}
export interface IFinancialCommonHorizDatePeriodNode {
  fromDate: FinancialDateMeta;
  toDate: FinancialDateMeta;
  total: IFinancialSheetTotal;
}
