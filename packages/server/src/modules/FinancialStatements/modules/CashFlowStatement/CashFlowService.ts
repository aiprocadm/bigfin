import { Injectable } from '@nestjs/common';
import { ModelObject } from 'objection';
import * as R from 'ramda';
import { I18nService } from 'nestjs-i18n';
import {
  ICashFlowStatementQuery,
  ICashFlowStatementDOO,
} from './Cashflow.types';
import { CashFlowStatement } from './CashFlow';
import { CashflowSheetMeta } from './CashflowSheetMeta';
import { CashFlowRepository } from './CashFlowRepository';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { getDefaultCashflowQuery } from './constants';
import { flattenTotals } from './cashFlowPreviousPeriod';
import { previousPeriodTotalRange } from '../../common/previousPeriodRange';

@Injectable()
export class CashFlowStatementService {
  /**
   * @param {CashFlowRepository} cashFlowRepo - Cash flow repository.
   * @param {CashflowSheetMeta} cashflowSheetMeta - Cashflow sheet meta.
   * @param {TenancyContext} tenancyContext - Tenancy context.
   */
  constructor(
    private readonly cashFlowRepo: CashFlowRepository,
    private readonly cashflowSheetMeta: CashflowSheetMeta,
    private readonly tenancyContext: TenancyContext,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieves cash at beginning transactions.
   * @param {ICashFlowStatementQuery} filter - Cash flow statement query.
   * @returns {Promise<ModelObject<AccountTransaction>[]>}
   */
  private async cashAtBeginningTransactions(
    filter: ICashFlowStatementQuery,
  ): Promise<ModelObject<AccountTransaction>[]> {
    const appendPeriodsOperToChain = (trans) =>
      R.append(
        this.cashFlowRepo.cashAtBeginningPeriodTransactions(filter),
        trans,
      );

    const promisesChain = R.pipe(
      R.append(this.cashFlowRepo.cashAtBeginningTotalTransactions(filter)),
      R.when(
        R.always(R.equals(filter.displayColumnsType, 'date_periods')),
        appendPeriodsOperToChain,
      ),
    )([]);
    const promisesResults = await Promise.all(promisesChain);
    const transactions = R.flatten(promisesResults);

    return transactions;
  }

  /**
   * Retrieve the cash flow sheet statement.
   * @param {ICashFlowStatementQuery} query - Cashflow query.
   * @returns {Promise<ICashFlowStatementDOO>}
   */
  public async cashFlow(
    query: ICashFlowStatementQuery,
  ): Promise<ICashFlowStatementDOO> {
    // Retrieve all accounts on the storage.
    const accounts = await this.cashFlowRepo.cashFlowAccounts();
    const tenant = await this.tenancyContext.getTenant(true);

    const filter = {
      ...getDefaultCashflowQuery(),
      ...query,
    };
    // Retrieve the accounts transactions.
    const transactions =
      await this.cashFlowRepo.getAccountsTransactions(filter);
    // Retrieve the net income transactions.
    const netIncome = await this.cashFlowRepo.getNetIncomeTransactions(filter);
    // Retrieve the cash at beginning transactions.
    const cashAtBeginningTransactions =
      await this.cashAtBeginningTransactions(filter);

    // Transformes the transactions to ledgers.
    const ledger = Ledger.fromTransactions(transactions);
    const cashLedger = Ledger.fromTransactions(cashAtBeginningTransactions);
    const netIncomeLedger = Ledger.fromTransactions(netIncome);

    // Retrieve the cashflow sheet meta first to get date format.
    const meta = await this.cashflowSheetMeta.meta(filter);

    // Cash flow statement.
    const cashFlowInstance = new CashFlowStatement(
      accounts,
      ledger,
      cashLedger,
      netIncomeLedger,
      filter,
      this.i18n,
      { baseCurrency: tenant.metadata.baseCurrency, dateFormat: meta.dateFormat },
    );

    const data = cashFlowInstance.reportData();

    return {
      data: await this.withPreviousPeriod(data, filter, cashFlowInstance),
      query: filter,
      meta,
    };
  }

  /**
   * Сравнение с прошлым периодом (остаток О3 ТЗ).
   *
   * Отчёт за прошлый период считается ТЕМ ЖЕ методом, просто с другими
   * датами. Это главное решение шага: Баланс и ОПиУ держат для прошлого
   * периода отдельные «леджеры» и десяток классов-композеров, но у Движения
   * денег другое устройство, и повторять там ту машинерию означало бы завести
   * ВТОРОЙ способ считать те же числа. Второй способ однажды расходится с
   * первым, и оба выглядят правильными.
   *
   * Цена — второй проход по проводкам, но только когда сравнение включено.
   * Флаги у второго вызова гасятся, иначе он потребовал бы третий, и так
   * без конца.
   */
  private async withPreviousPeriod(
    data: any,
    filter: ICashFlowStatementQuery,
    cashFlowInstance: CashFlowStatement,
  ): Promise<any> {
    const showPrevious = Boolean(filter.previousPeriod);
    const showChange = Boolean(filter.previousPeriodAmountChange);
    const showPercentage = Boolean(filter.previousPeriodPercentageChange);

    if (!showPrevious && !showChange && !showPercentage) {
      return data;
    }
    const range = previousPeriodTotalRange(filter.fromDate, filter.toDate);

    const previous = await this.cashFlow({
      ...filter,
      fromDate: range.fromDate,
      toDate: range.toDate,
      previousPeriod: false,
      previousPeriodAmountChange: false,
      previousPeriodPercentageChange: false,
    });

    return cashFlowInstance.withPreviousPeriod(
      data,
      flattenTotals(previous.data),
      { showPrevious, showChange, showPercentage },
    );
  }
}
