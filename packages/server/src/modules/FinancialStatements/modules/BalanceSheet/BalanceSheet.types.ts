import {
  IFinancialSheetBranchesQuery,
  IFinancialSheetCommonMeta,
  IFormatNumberSettings,
  INumberFormatQuery,
} from '../../types/Report.types';
import { IFinancialTable } from '../../types/Table.types';

// Balance sheet schema nodes types.
export enum BALANCE_SHEET_SCHEMA_NODE_TYPE {
  AGGREGATE = 'AGGREGATE',
  ACCOUNTS = 'ACCOUNTS',
  ACCOUNT = 'ACCOUNT',
  NET_INCOME = 'NET_INCOME',
}

export enum BALANCE_SHEET_NODE_TYPE {
  AGGREGATE = 'AGGREGATE',
  ACCOUNTS = 'ACCOUNTS',
  ACCOUNT = 'ACCOUNT',
}

// Balance sheet schema nodes ids.
export enum BALANCE_SHEET_SCHEMA_NODE_ID {
  ASSETS = 'ASSETS',
  CURRENT_ASSETS = 'CURRENT_ASSETS',
  CASH_EQUIVALENTS = 'CASH_EQUIVALENTS',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  NON_CURRENT_ASSET = 'NON_CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  OTHER_CURRENT_ASSET = 'OTHER_CURRENT_ASSET',
  INVENTORY = 'INVENTORY',
  LIABILITY_EQUITY = 'LIABILITY_EQUITY',
  LIABILITY = 'LIABILITY',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LOGN_TERM_LIABILITY = 'LOGN_TERM_LIABILITY',
  NON_CURRENT_LIABILITY = 'NON_CURRENT_LIABILITY',
  EQUITY = 'EQUITY',
  NET_INCOME = 'NET_INCOME',
}

// Balance sheet query.
export interface IBalanceSheetQuery extends IFinancialSheetBranchesQuery {
  displayColumnsType: 'total' | 'date_periods';
  displayColumnsBy: string;

  fromDate: string;
  toDate: string;

  numberFormat: INumberFormatQuery;
  noneTransactions: boolean;
  noneZero: boolean;
  basis: 'cash' | 'accrual';
  accountIds: number[];

  percentageOfColumn: boolean;
  percentageOfRow: boolean;

  previousPeriod: boolean;
  previousPeriodAmountChange: boolean;
  previousPeriodPercentageChange: boolean;

  previousYear: boolean;
  previousYearAmountChange: boolean;
  previousYearPercentageChange: boolean;
}

// Balance sheet meta.
export interface IBalanceSheetMeta extends IFinancialSheetCommonMeta {
  formattedAsDate: string;
  formattedDateRange: string;
}

export interface IBalanceSheetFormatNumberSettings
  extends IFormatNumberSettings {
  type: string;
}

// Balance sheet service.
export interface IBalanceSheetStatementService {
  balanceSheet(
    tenantId: number,
    query: IBalanceSheetQuery,
  ): Promise<IBalanceSheetDOO>;
}

export type IBalanceSheetStatementData = IBalanceSheetDataNode[];

export interface IBalanceSheetDOO {
  query: IBalanceSheetQuery;
  data: IBalanceSheetStatementData;
  meta: IBalanceSheetMeta;
}

export interface IBalanceSheetCommonNode {
  total: IBalanceSheetTotal;
  /**
   * Итоги по колонкам-периодам (когда отчёт разбит по месяцам/кварталам).
   *
   * Вид был указан неверно — `IBalanceSheetTotal[]`. У такого итога нет поля
   * `total`, а весь код читает у элемента именно `horizontalTotals[i].total.amount`
   * и дописывает ему `percentageRow`/`percentageColumn`. То есть во время
   * работы здесь всегда лежал `IBalanceSheetTotalPeriod`. Соседний отчёт
   * «Прибыли и убытки» уже описан правильно.
   */
  horizontalTotals?: IBalanceSheetTotalPeriod[];

  percentageRow?: IBalanceSheetPercentageAmount;
  percentageColumn?: IBalanceSheetPercentageAmount;

  previousPeriod?: IBalanceSheetTotal;
  previousPeriodChange?: IBalanceSheetTotal;
  previousPeriodPercentage?: IBalanceSheetPercentageAmount;

  previousYear?: IBalanceSheetTotal;
  previousYearChange?: IBalanceSheetTotal;
  previousYearPercentage?: IBalanceSheetPercentageAmount;
}

export interface IBalanceSheetAggregateNode extends IBalanceSheetCommonNode {
  id: string;
  name: string;
  nodeType: BALANCE_SHEET_SCHEMA_NODE_TYPE.AGGREGATE;

  // Узел собирается СРАЗУ С ДВУМЯ полями вида — `nodeType` и `type`; второе
  // в перечне не значилось. Ровно то же самое уже описано у узла-группы
  // счетов ниже. Сводить их в одно без нужды не стали — только описали.
  type?: BALANCE_SHEET_SCHEMA_NODE_TYPE;

  children?: IBalanceSheetDataNode[];
}

export interface IBalanceSheetTotal {
  amount: number;
  formattedAmount: string;
  currencyCode: string;
  date?: string | Date;
}

export interface IBalanceSheetAccountsNode extends IBalanceSheetCommonNode {
  id: number | string;
  name: string;
  nodeType: BALANCE_SHEET_SCHEMA_NODE_TYPE.ACCOUNTS;

  // Узел собирается СРАЗУ С ДВУМЯ полями вида — `nodeType` и `type`; второе
  // в перечне не значилось. Их не сводили в одно намеренно или по недосмотру
  // — неизвестно, поэтому оставлено как есть и лишь описано.
  type?: BALANCE_SHEET_SCHEMA_NODE_TYPE;

  children: IBalanceSheetAccountNode[];
}

export interface IBalanceSheetAccountNode extends IBalanceSheetCommonNode {
  id: number;
  index: number;
  name: string;
  code: string;
  parentAccountId?: number;
  nodeType: BALANCE_SHEET_SCHEMA_NODE_TYPE.ACCOUNT;
  children?: IBalanceSheetAccountNode[];
}

export interface IBalanceSheetNetIncomeNode extends IBalanceSheetCommonNode {
  // Номер — СТРОКА («NET_INCOME»), как и в схеме отчёта. Стояло «число»,
  // хотя такого номера у этого узла не бывает: он не счёт из справочника,
  // а итоговая строка.
  id: string;
  name: string;
  nodeType: BALANCE_SHEET_SCHEMA_NODE_TYPE.NET_INCOME;
}

export type IBalanceSheetDataNode =
  | IBalanceSheetAggregateNode
  | IBalanceSheetAccountNode
  | IBalanceSheetAccountsNode
  | IBalanceSheetNetIncomeNode;

export interface IBalanceSheetPercentageAmount {
  amount: number;
  formattedAmount: string;
}

export interface IBalanceSheetSchemaAggregateNode {
  name: string;
  id: string;
  type: BALANCE_SHEET_SCHEMA_NODE_TYPE;
  children: IBalanceSheetSchemaNode[];
  alwaysShow: boolean;
}

export interface IBalanceSheetSchemaAccountNode {
  name: string;
  id: string;
  type: BALANCE_SHEET_SCHEMA_NODE_TYPE;
  accountsTypes: string[];

  // Дети у узла схемы ЕСТЬ — их читает `reportSchemaAccountsNodeMapper`.
  // В перечне их не было: он отстал от кода.
  children?: IBalanceSheetSchemaAccountNode[];
}

export interface IBalanceSheetSchemaNetIncomeNode {
  id: string;
  name: string;
  type: BALANCE_SHEET_SCHEMA_NODE_TYPE;
}

export type IBalanceSheetSchemaNode =
  | IBalanceSheetSchemaAccountNode
  | IBalanceSheetSchemaAggregateNode
  | IBalanceSheetSchemaNetIncomeNode;

export interface IBalanceSheetDatePeriods {
  assocAccountNodeDatePeriods(node): any;
  initDateRangeCollection(): void;
}

export interface IBalanceSheetComparsions {
  assocPreviousYearAccountNode(node);
  hasPreviousPeriod(): boolean;
  hasPreviousYear(): boolean;
  assocPreviousPeriodAccountNode(node);
}

export interface IBalanceSheetTotalPeriod extends IFinancialSheetTotalPeriod {
  percentageRow?: IBalanceSheetPercentageAmount;
  percentageColumn?: IBalanceSheetPercentageAmount;
}

export interface IFinancialSheetTotalPeriod {
  fromDate: any;
  toDate: any;
  total: any;
}

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

export interface IBalanceSheetTable extends IFinancialTable {
  meta: IBalanceSheetMeta;
  query: IBalanceSheetQuery;
}
