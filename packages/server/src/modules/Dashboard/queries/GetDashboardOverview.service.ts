// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ProfitLossSheetService } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheetService';
import { ProfitLossAggregateNodeId } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheet.types';
import { GetMoneySummaryService } from './GetMoneySummary.service';

export interface OverviewAmount {
  amount: number;
  formattedAmount: string;
}

export interface OverviewTile extends OverviewAmount {
  /** Та же величина за предыдущий период такой же длины. */
  previousAmount: number;
  /** Изменение к прошлому периоду в процентах. `null` — делить не на что. */
  changePercent: number | null;
}

export interface OverviewMonth {
  /** Месяц в виде `YYYY-MM`. */
  month: string;
  income: number;
  expenses: number;
  /** Прибыль месяца: доходы минус расходы. */
  profit: number;
}

export interface OverviewAccount {
  id: number;
  name: string;
  amount: number;
  formattedAmount: string;
}

export interface OverviewExpenseShare {
  id: number | null;
  name: string;
  amount: number;
  formattedAmount: string;
  /** Доля в расходах периода, проценты. */
  sharePercent: number;
}

export interface DashboardOverview {
  period: { fromDate: string; toDate: string };
  tiles: {
    cashBalance: OverviewAmount;
    income: OverviewTile;
    expenses: OverviewTile;
    netProfit: OverviewTile & {
      /** Рентабельность: прибыль к доходам, проценты. */
      marginPercent: number | null;
    };
  };
  months: OverviewMonth[];
  accounts: OverviewAccount[];
  topExpenses: OverviewExpenseShare[];
  currencyCode: string;
}

/** Сколько месяцев показывает график «Деньги по месяцам» (п. 2.2 ТЗ). */
export const OVERVIEW_MONTHS = 12;

/** Сколько статей расходов показывает блок «Топ расходов». */
export const TOP_EXPENSES_LIMIT = 5;

/**
 * Всё для главной страницы одним ответом (этап 2 ТЗ, п. 2.3).
 *
 * Пять отдельных запросов на главной недопустимы, поэтому здесь собирается
 * и полоса показателей, и ряды графика, и остатки по счетам, и топ статей
 * расходов.
 *
 * Главное правило: **второго способа считать те же суммы быть не должно.**
 * Доходы, расходы и прибыль берутся из отчёта о прибылях и убытках —
 * из тех же узлов, что видит человек в разделе «Отчёты», — а остатки и долги
 * из `GetMoneySummary`. Иначе главная и отчёт разойдутся, и верить будет
 * нечему.
 */
@Injectable()
export class GetDashboardOverviewService {
  constructor(
    private readonly profitLoss: ProfitLossSheetService,
    private readonly moneySummary: GetMoneySummaryService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async getOverview(
    fromDate?: string,
    toDate?: string,
  ): Promise<DashboardOverview> {
    const period = this.resolvePeriod(fromDate, toDate);
    const previous = this.previousPeriod(period);

    const metadata = await this.tenancyContext.getTenantMetadata();
    const currencyCode = (metadata as any)?.baseCurrency ?? 'RUB';

    const [current, prior, summary, accounts] = await Promise.all([
      this.profitLossTotals(period.fromDate, period.toDate),
      this.profitLossTotals(previous.fromDate, previous.toDate),
      this.moneySummary.getMoneySummary(),
      this.getCashAccounts(currencyCode),
    ]);

    const months = await this.getMonths(period.toDate);

    const netProfit = current.income - current.expenses;
    const previousNetProfit = prior.income - prior.expenses;

    return {
      period,
      tiles: {
        cashBalance: summary.cashBalance,
        income: this.tile(current.income, prior.income, currencyCode),
        expenses: this.tile(current.expenses, prior.expenses, currencyCode),
        netProfit: {
          ...this.tile(netProfit, previousNetProfit, currencyCode),
          marginPercent:
            current.income > 0
              ? this.round((netProfit / current.income) * 100)
              : null,
        },
      },
      months,
      accounts,
      topExpenses: this.topExpenses(current, currencyCode),
      currencyCode,
    };
  }

  /** Период по умолчанию — текущий месяц (п. 2.2 ТЗ). */
  private resolvePeriod(fromDate?: string, toDate?: string) {
    const from = fromDate
      ? moment(fromDate)
      : moment().startOf('month');
    const to = toDate ? moment(toDate) : moment().endOf('month');

    return {
      fromDate: from.format('YYYY-MM-DD'),
      toDate: to.format('YYYY-MM-DD'),
    };
  }

  /**
   * Предыдущий период такой же длины: с ним сравнивается плитка.
   * Месяц сравнивается с месяцем, квартал с кварталом.
   */
  private previousPeriod(period: { fromDate: string; toDate: string }) {
    const from = moment(period.fromDate);
    const to = moment(period.toDate);
    const days = to.diff(from, 'days') + 1;

    return {
      fromDate: from.clone().subtract(days, 'days').format('YYYY-MM-DD'),
      toDate: from.clone().subtract(1, 'days').format('YYYY-MM-DD'),
    };
  }

  /**
   * Итоги отчёта о прибылях и убытках за период.
   *
   * Берём готовые узлы отчёта, а не считаем заново: плитки обязаны сходиться
   * с разделом «Отчёты» до копейки.
   */
  private async profitLossTotals(fromDate: string, toDate: string) {
    const report = await this.profitLoss.profitLossSheet({
      fromDate,
      toDate,
    } as any);

    const nodes = (report as any)?.data ?? [];

    return {
      income: this.nodeTotal(nodes, ProfitLossAggregateNodeId.INCOME),
      expenses: this.nodeTotal(nodes, ProfitLossAggregateNodeId.EXPENSES),
      expenseChildren: this.nodeChildren(
        nodes,
        ProfitLossAggregateNodeId.EXPENSES,
      ),
    };
  }

  /** Сумма узла отчёта по его имени. */
  private nodeTotal(nodes: any[], id: string): number {
    const node = this.findNode(nodes, id);
    return Number(node?.total?.amount ?? 0);
  }

  /** Строки-счета внутри узла: из них собирается топ статей расходов. */
  private nodeChildren(nodes: any[], id: string): any[] {
    const node = this.findNode(nodes, id);
    return node?.children ?? [];
  }

  private findNode(nodes: any[], id: string): any {
    for (const node of nodes ?? []) {
      if (node?.id === id) return node;

      const found = this.findNode(node?.children ?? [], id);
      if (found) return found;
    }
    return undefined;
  }

  /** Ряды графика: доходы, расходы и прибыль по месяцам. */
  private async getMonths(toDate: string): Promise<OverviewMonth[]> {
    const end = moment(toDate).endOf('month');
    const start = end.clone().subtract(OVERVIEW_MONTHS - 1, 'months').startOf('month');

    const report = await this.profitLoss.profitLossSheet({
      fromDate: start.format('YYYY-MM-DD'),
      toDate: end.format('YYYY-MM-DD'),
      displayColumnsBy: 'date_periods',
      displayColumnsType: 'date_periods',
    } as any);

    const nodes = (report as any)?.data ?? [];
    const income = this.findNode(nodes, ProfitLossAggregateNodeId.INCOME);
    const expenses = this.findNode(nodes, ProfitLossAggregateNodeId.EXPENSES);

    const months: OverviewMonth[] = [];

    for (let index = 0; index < OVERVIEW_MONTHS; index += 1) {
      const month = start.clone().add(index, 'months');
      const incomeAmount = Number(
        income?.periods?.[index]?.total?.amount ?? 0,
      );
      const expensesAmount = Number(
        expenses?.periods?.[index]?.total?.amount ?? 0,
      );

      months.push({
        month: month.format('YYYY-MM'),
        income: incomeAmount,
        expenses: expensesAmount,
        profit: incomeAmount - expensesAmount,
      });
    }
    return months;
  }

  /** Остатки денежных счетов: расчётные счета и касса. */
  private async getCashAccounts(
    currencyCode: string,
  ): Promise<OverviewAccount[]> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', [ACCOUNT_TYPE.BANK, ACCOUNT_TYPE.CASH])
      .where('active', true);

    return accounts.map((account: any) => ({
      id: account.id,
      name: account.name,
      amount: Number(account.amount ?? 0),
      formattedAmount: this.format(Number(account.amount ?? 0), currencyCode),
    }));
  }

  /** Топ статей расходов с долей в расходах периода. */
  private topExpenses(
    current: { expenses: number; expenseChildren: any[] },
    currencyCode: string,
  ): OverviewExpenseShare[] {
    const total = current.expenses;

    return current.expenseChildren
      .map((node: any) => ({
        id: node?.id ?? null,
        name: node?.name ?? '',
        amount: Number(node?.total?.amount ?? 0),
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, TOP_EXPENSES_LIMIT)
      .map((row) => ({
        ...row,
        formattedAmount: this.format(row.amount, currencyCode),
        sharePercent: total > 0 ? this.round((row.amount / total) * 100) : 0,
      }));
  }

  /** Плитка: величина за период и её изменение к прошлому. */
  private tile(
    amount: number,
    previousAmount: number,
    currencyCode: string,
  ): OverviewTile {
    return {
      amount,
      formattedAmount: this.format(amount, currencyCode),
      previousAmount,
      // Ноль в знаменателе — не «рост на 100%», а «сравнивать не с чем».
      changePercent:
        previousAmount !== 0
          ? this.round(((amount - previousAmount) / Math.abs(previousAmount)) * 100)
          : null,
    };
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private format(amount: number, currencyCode: string): string {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}
