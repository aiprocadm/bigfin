import { Inject, Injectable, Scope } from '@nestjs/common';
import * as R from 'ramda';
import { Knex } from 'knex';
import { isEmpty } from 'lodash';
import {
  IAccountTransactionsGroupBy,
  IBalanceSheetQuery,
} from './BalanceSheet.types';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { FinancialDatePeriods } from '../../common/FinancialDatePeriods';
import { BalanceSheetRepositoryNetIncome } from './BalanceSheetRepositoryNetIncome';
import { ILedger } from '@/modules/Ledger/types/Ledger.types';
import { Ledger } from '@/modules/Ledger/Ledger';
import { transformToMapBy } from '@/utils/transform-to-map-by';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { INamedModifiableQuery } from '../../common/queryTypes';
import { applyLegalEntityScope } from '@/modules/LegalEntities/utils/legalEntityScope';
import { applyProjectScope } from '@/modules/Projects/utils/projectScope';
import {
  INTERCOMPANY_SETTLEMENT_NAME,
  needsSettlementLine,
  settlementAccountSide,
  settlementBalance,
  settlementEntry,
} from '@/modules/LegalEntities/utils/intercompanySettlement';

@Injectable({ scope: Scope.TRANSIENT })
export class BalanceSheetRepository extends R.compose(
  BalanceSheetRepositoryNetIncome,
  FinancialDatePeriods,
)(class {}) {
  /**
   * Account model.
   */
  @Inject(Account.name)
  public readonly accountModel: TenantModelProxy<typeof Account>;

  /**
   * Account transaction model.
   */
  @Inject(AccountTransaction.name)
  public readonly accountTransactionModel: TenantModelProxy<
    typeof AccountTransaction
  >;

  /**
   * @description Balance sheet query.
   * @param {BalanceSheetQuery}
   */
  public query: BalanceSheetQuery;

  /**
   * @param {}
   */
  public accounts: any;

  /**
   * @param {}
   */
  public accountsGraph: any;

  /**
   *
   */
  public accountsByType: any;

  /**
   * Счета, разложенные по РОДИТЕЛЬСКОМУ виду.
   *
   * Поле собиралось в `initAccounts`, но нигде не объявлялось. Читает его
   * расчёт чистой прибыли (`BalanceSheetRepositoryNetIncome`) — то есть поле
   * живое, просто невидимое для проверки типов.
   */
  public accountsByParentType: any;

  /**
   * PY from date.
   * @param {Date}
   */
  public readonly PYFromDate: Date;

  /**
   * PY to date.
   * @param {Date}
   */
  public readonly PYToDate: Date;

  /**
   * PP to date.
   * @param {Date}
   */
  public readonly PPToDate: Date;

  /**
   * PP from date.
   * @param {Date}
   */
  public readonly PPFromDate: Date;

  /**
   * Total closing accounts ledger.
   * @param {Ledger}
   */
  /**
   * Итог расчётов внутри группы: плюс — юрлицу должны, минус — должно оно.
   * По знаку выбирается сторона баланса (остаток К9).
   */
  public settlementTotal = 0;

  public totalAccountsLedger: Ledger;

  /**
   * Total income accounts ledger.
   */
  public incomeLedger: Ledger;

  /**
   * Total expense accounts ledger.
   */
  public expensesLedger: Ledger;

  /**
   * Transactions group type.
   * @param {IAccountTransactionsGroupBy}
   */
  public transactionsGroupType: IAccountTransactionsGroupBy =
    IAccountTransactionsGroupBy.Month;

  // -----------------------
  // # Date Periods
  // -----------------------
  /**
   * @param {Ledger}
   */
  public periodsAccountsLedger: Ledger;

  /**
   * @param {Ledger}
   */
  public periodsOpeningAccountLedger: Ledger;

  // -----------------------
  // # Previous Year (PY).
  // -----------------------
  /**
   * @param {Ledger}
   */
  public PYPeriodsOpeningAccountLedger: Ledger;

  /**
   * @param {Ledger}
   */
  public PYPeriodsAccountsLedger: Ledger;

  /**
   * @param {Ledger}
   */
  public PYTotalAccountsLedger: ILedger;

  // -----------------------
  // # Previous Period (PP).
  // -----------------------
  /**
   * @param {Ledger}
   */
  public PPTotalAccountsLedger: Ledger;

  /**
   * @param {Ledger}
   */
  public PPPeriodsAccountsLedger: ILedger;

  /**
   * @param {Ledger}
   */
  public PPPeriodsOpeningAccountLedger: ILedger;

  /**
   * Constructor method.
   * @param {IBalanceSheetQuery} query
   */
  public setQuery(query: IBalanceSheetQuery) {
    this.query = new BalanceSheetQuery(query);

    this.transactionsGroupType = this.getGroupByFromDisplayColumnsBy(
      this.query.displayColumnsBy,
    );
  }

  /**
   * Async initialize.
   * @returns {Promise<void>}
   */
  public asyncInitialize = async (query: IBalanceSheetQuery) => {
    this.setQuery(query);

    await this.initAccounts();
    await this.initAccountsGraph();

    await this.initAccountsTotalLedger();

    // Date periods.
    if (this.query.isDatePeriodsColumnsType()) {
      await this.initTotalDatePeriods();
    }
    // Previous Year (PY).
    if (this.query.isPreviousYearActive()) {
      await this.initTotalPreviousYear();
    }
    if (
      this.query.isPreviousYearActive() &&
      this.query.isDatePeriodsColumnsType()
    ) {
      await this.initPeriodsPreviousYear();
    }
    // Previous Period (PP).
    if (this.query.isPreviousPeriodActive()) {
      await this.initTotalPreviousPeriod();
    }
    if (
      this.query.isPreviousPeriodActive() &&
      this.query.isDatePeriodsColumnsType()
    ) {
      await this.initPeriodsPreviousPeriod();
    }
    //
    await this.asyncInitializeNetIncome();
  };

  // ----------------------------
  // # Accounts
  // ----------------------------
  public initAccounts = async () => {
    const accounts = await this.getAccounts();

    await this.initSettlementSide();

    const withSettlement = this.withSettlementAccount(accounts);

    this.accounts = withSettlement;
    this.accountsByType = transformToMapBy(withSettlement, 'accountType');
    this.accountsByParentType = transformToMapBy(
      withSettlement,
      'accountParentType',
    );
  };

  /**
   * Initialize accounts graph.
   */
  public initAccountsGraph = async () => {
    this.accountsGraph = this.accountModel().toDependencyGraph(this.accounts);
  };

  // ----------------------------
  // # Closing Total
  // ----------------------------
  /**
   * Initialize accounts closing total based on the given query.
   * @returns {Promise<void>}
   */
  public initAccountsTotalLedger = async (): Promise<void> => {
    const totalByAccount = await this.closingAccountsTotal(this.query.toDate);

    // Inject to the repository.
    this.totalAccountsLedger = Ledger.fromTransactions(totalByAccount);
  };

  // ----------------------------
  // # Date periods.
  // ----------------------------
  /**
   * Initialize date periods total.
   * @returns {Promise<void>}
   */
  public initTotalDatePeriods = async (): Promise<void> => {
    // Retrieves grouped transactions by given date group.
    const periodsByAccount = await this.accountsDatePeriods(
      this.query.fromDate,
      this.query.toDate,
      this.transactionsGroupType,
    );
    // Retrieves opening balance of grouped transactions.
    const periodsOpeningByAccount = await this.closingAccountsTotal(
      this.query.fromDate,
    );
    // Inject to the repository.
    this.periodsAccountsLedger = Ledger.fromTransactions(periodsByAccount);
    this.periodsOpeningAccountLedger = Ledger.fromTransactions(
      periodsOpeningByAccount,
    );
  };

  // ----------------------------
  // # Previous Year (PY).
  // ----------------------------
  /**
   * Initialize total of previous year.
   * @returns {Promise<void>}
   */
  public initTotalPreviousYear = async (): Promise<void> => {
    const PYTotalsByAccounts = await this.closingAccountsTotal(
      this.query.PYToDate,
    );
    // Inject to the repository.
    this.PYTotalAccountsLedger = Ledger.fromTransactions(PYTotalsByAccounts);
  };

  /**
   * Initialize date periods of previous year.
   * @returns {Promise<void>}
   */
  public initPeriodsPreviousYear = async (): Promise<void> => {
    const PYPeriodsBYAccounts = await this.accountsDatePeriods(
      this.query.PYFromDate,
      this.query.PYToDate,
      this.transactionsGroupType,
    );
    // Retrieves opening balance of grouped transactions.
    const periodsOpeningByAccount = await this.closingAccountsTotal(
      this.query.PYFromDate,
    );
    // Inject to the repository.
    this.PYPeriodsAccountsLedger = Ledger.fromTransactions(PYPeriodsBYAccounts);
    this.PYPeriodsOpeningAccountLedger = Ledger.fromTransactions(
      periodsOpeningByAccount,
    );
  };

  // ----------------------------
  // # Previous Year (PP).
  // ----------------------------
  /**
   * Initialize total of previous year.
   * @returns {Promise<void>}
   */
  public initTotalPreviousPeriod = async (): Promise<void> => {
    const PPTotalsByAccounts = await this.closingAccountsTotal(
      this.query.PPToDate,
    );
    // Inject to the repository.
    this.PPTotalAccountsLedger = Ledger.fromTransactions(PPTotalsByAccounts);
  };

  /**
   * Initialize date periods of previous year.
   * @returns {Promise<void>}
   */
  public initPeriodsPreviousPeriod = async (): Promise<void> => {
    const PPPeriodsBYAccounts = await this.accountsDatePeriods(
      this.query.PPFromDate,
      this.query.PPToDate,
      this.transactionsGroupType,
    );
    // Retrieves opening balance of grouped transactions.
    const periodsOpeningByAccount = await this.closingAccountsTotal(
      this.query.PPFromDate,
    );
    // Inject to the repository.
    this.PPPeriodsAccountsLedger = Ledger.fromTransactions(PPPeriodsBYAccounts);
    this.PPPeriodsOpeningAccountLedger = Ledger.fromTransactions(
      periodsOpeningByAccount,
    );
  };

  // ----------------------------
  // # Utils
  // ----------------------------
  /**
   * Retrieve accounts of the report.
   * @return {Promise<IAccount[]>}
   */
  public getAccounts = () => {
    return this.accountModel().query();
  };

  /**
   * Closing accounts date periods.
   * @param {Date} fromDate
   * @param {Date} toDate
   * @param {string} datePeriodsType
   * @returns
   */
  public accountsDatePeriods = async (
    fromDate: Date,
    toDate: Date,
    datePeriodsType: string,
  ) => {
    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.sum('credit as credit');
        query.sum('debit as debit');
        query.groupBy('accountId');
        query.select(['accountId']);

        query.modify('groupByDateFormat', datePeriodsType);
        query.modify('filterDateRange', fromDate, toDate);
        query.withGraphFetched('account');

        this.commonFilterBranchesQuery(query);
      });

    return this.withSettlementPeriods(rows, fromDate, toDate, datePeriodsType);
  };

  /**
   * Retrieve the opening balance transactions of the report.
   * @param {Date|string} openingDate -
   */
  public closingAccountsTotal = async (openingDate: Date | string) => {
    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.sum('credit as credit');
        query.sum('debit as debit');
        query.groupBy('accountId');
        query.select(['accountId']);

        query.modify('filterDateRange', null, openingDate);
        query.withGraphFetched('account');

        this.commonFilterBranchesQuery(query);
      });

    return this.withSettlementTotal(rows, openingDate);
  };

  // ----------------------------
  // # Расчёты внутри группы (остаток К9)
  // ----------------------------
  /**
   * Нужна ли отчёту строка расчётов внутри группы.
   *
   * Спрашивается в трёх местах, поэтому вынесено сюда: три отдельных условия
   * рано или поздно разъезжаются, и тогда счёт в списке есть, а проводки к
   * нему нет — строка молча показывает ноль.
   */
  private get needsSettlement(): boolean {
    return needsSettlementLine(this.query?.legalEntityIds);
  }

  /**
   * Вычисляемый счёт «Расчёты внутри группы» в списке счетов отчёта.
   *
   * Собирается ЧЕРЕЗ МОДЕЛЬ, а не простым объектом: «дебетовый ли счёт» и
   * «к какому разделу относится» — вычисляемые свойства модели. Простой
   * объект их не имеет, и книга отчёта посчитала бы остаток задом наперёд.
   */
  private withSettlementAccount = (accounts: any[]): any[] => {
    if (!this.needsSettlement) return accounts;

    const side = settlementAccountSide(this.settlementTotal);
    const settlement = this.accountModel().fromJson({
      id: side.accountId,
      name: INTERCOMPANY_SETTLEMENT_NAME,
      slug: side.slug,
      accountType: side.accountType,
      parentAccountId: null,
      code: null,
      index: 1,
      active: true,
      predefined: true,
      description: '',
    });

    return [...accounts, settlement];
  };

  /**
   * Итог расчётов внутри группы — ОДИН дешёвый запрос перед сборкой отчёта.
   *
   * ЗАЧЕМ ОТДЕЛЬНО. Сторона баланса выбирается по знаку итога: отдал своим —
   * это имущество, получил — обязательство. А список счетов отчёта строится
   * РАНЬШЕ книг, из которых знак стал бы известен. Без этого запроса пришлось
   * бы завести обе стороны сразу, и у человека всегда висела бы лишняя
   * пустая строка с непонятным названием.
   *
   * Запрос складывает две суммы без группировки — это одна строка ответа.
   */
  private initSettlementSide = async (): Promise<void> => {
    this.settlementTotal = 0;

    if (!this.needsSettlement) return;

    const rows: any = await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.sum('credit as credit');
        query.sum('debit as debit');

        query.modify('filterDateRange', null, this.query.toDate);

        this.commonFilterBranchesQuery(query);
      });
    const row = Array.isArray(rows) ? rows[0] : rows;

    this.settlementTotal = settlementBalance({
      debit: Number(row?.debit) || 0,
      credit: Number(row?.credit) || 0,
    });
  };

  /**
   * Перекос отбора: насколько дебет не сошёлся с кредитом.
   *
   * Считается ИЗ УЖЕ ПОЛУЧЕННЫХ СТРОК, без отдельного запроса. Строки — это и
   * есть всё, что отчёт видит; складывать их второй раз в базе значило бы
   * просить её посчитать то, что уже лежит в памяти.
   */
  private scopeNet = (rows: any[]): { debit: number; credit: number } =>
    (rows ?? []).reduce(
      (acc, row) => ({
        debit: acc.debit + (Number(row.debit) || 0),
        credit: acc.credit + (Number(row.credit) || 0),
      }),
      { debit: 0, credit: 0 },
    );

  /**
   * Строка проводки вычисляемого счёта.
   *
   * `account` кладётся рядом намеренно: книга отчёта читает «дебетовый ли
   * счёт» именно оттуда, а не из списка счетов.
   */
  private settlementRow = (
    net: { debit: number; credit: number },
    date?: string,
  ): any => {
    const entry = settlementEntry(net);
    const account = this.withSettlementAccount([]).at(-1);

    return { ...entry, accountId: account.id, account, date };
  };

  /** Досылает строку расчётов к остаткам на дату. */
  private withSettlementTotal = (
    rows: any[],
    _openingDate: Date | string,
  ): any[] => {
    if (!this.needsSettlement) return rows;

    const net = this.scopeNet(rows);
    if (net.debit === net.credit) return rows;

    return [...rows, this.settlementRow(net)];
  };

  /**
   * Досылает строку расчётов к разрезу по периодам — по строке НА КАЖДЫЙ
   * период.
   *
   * Одной строкой на весь отчёт обойтись нельзя: колонки периодов считаются
   * порознь, и общая сумма легла бы целиком в один месяц.
   */
  private withSettlementPeriods = (
    rows: any[],
    _fromDate: Date,
    _toDate: Date,
    _datePeriodsType: string,
  ): any[] => {
    if (!this.needsSettlement) return rows;

    const byPeriod = new Map<string, { debit: number; credit: number }>();

    (rows ?? []).forEach((row) => {
      const key = String(row.date ?? '');
      const acc = byPeriod.get(key) ?? { debit: 0, credit: 0 };

      acc.debit += Number(row.debit) || 0;
      acc.credit += Number(row.credit) || 0;
      byPeriod.set(key, acc);
    });

    const extra = [...byPeriod.entries()]
      .filter(([, net]) => net.debit !== net.credit)
      .map(([date, net]) => this.settlementRow(net, date));

    return [...rows, ...extra];
  };

  /**
   * Общий отбор отчёта: подразделения и юрлица.
   *
   * ОДНО МЕСТО НА ВСЕ ЗАПРОСЫ отчёта. Баланс собирается несколькими
   * запросами — обороты за период, остатки на начало, разрез по периодам, —
   * и отбор, забытый хотя бы в одном из них, даёт отчёт, который не сходится
   * сам с собой.
   */
  public commonFilterBranchesQuery = (query: INamedModifiableQuery) => {
    if (!isEmpty(this.query.branchesIds)) {
      query.modify('filterByBranches', this.query.branchesIds);
    }
    applyLegalEntityScope(query, {
      legalEntityIds: this.query.legalEntityIds,
    });
    applyProjectScope(query as any, {
      projectsIds: (this.query as any).projectsIds,
    });
  };
}
