// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ProfitLossSheetService } from '../modules/ProfitLossSheet/ProfitLossSheetService';
import { ProfitLossAggregateNodeId } from '../modules/ProfitLossSheet/ProfitLossSheet.types';

/** Какие отчёты умеют показывать график над таблицей (п. 4.2 ТЗ). */
export type ReportChartKind = 'profit_loss' | 'cash_flow';

export interface ReportChartPoint {
  /** Месяц в виде `YYYY-MM`. */
  month: string;
  /** Для ОПиУ — выручка, для ДДС — поступления. */
  first: number;
  /** Для ОПиУ — прибыль, для ДДС — выплаты. */
  second: number;
}

export interface ReportChart {
  kind: ReportChartKind;
  points: ReportChartPoint[];
}

/**
 * Ряды графика над таблицей отчёта (этап 4 ТЗ, п. 4.2).
 *
 * Считает сервер, а не витрина: график обязан показывать ровно те же числа,
 * что таблица под ним. У ОПиУ они берутся из узлов самого отчёта, у ДДС —
 * из движения по денежным счетам, то есть из того же источника, что и
 * остатки в разделе «Банк».
 *
 * Разрез всегда по месяцам: он отвечает на вопрос «как шли дела», а недельные
 * и годовые столбцы для этого либо слишком дробные, либо слишком крупные.
 */
@Injectable()
export class GetReportChartService {
  constructor(
    private readonly profitLoss: ProfitLossSheetService,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async getChart(
    kind: ReportChartKind,
    fromDate: string,
    toDate: string,
  ): Promise<ReportChart> {
    const months = this.monthsBetween(fromDate, toDate);

    const points =
      kind === 'profit_loss'
        ? await this.profitLossPoints(months)
        : await this.cashFlowPoints(months);

    return { kind, points };
  }

  /** Список месяцев периода: по нему строятся столбцы. */
  private monthsBetween(fromDate: string, toDate: string): string[] {
    const start = moment(fromDate).startOf('month');
    const end = moment(toDate).endOf('month');
    const months: string[] = [];

    const cursor = start.clone();
    // Ограничение в 36 столбцов: больше на экран всё равно не помещается,
    // а каждый месяц — отдельный подсчёт.
    while (cursor.isSameOrBefore(end) && months.length < 36) {
      months.push(cursor.format('YYYY-MM'));
      cursor.add(1, 'month');
    }
    return months;
  }

  /** ОПиУ: выручка и прибыль по месяцам — из узлов отчёта. */
  private async profitLossPoints(
    months: string[],
  ): Promise<ReportChartPoint[]> {
    const points = await Promise.all(
      months.map(async (month) => {
        const from = moment(month, 'YYYY-MM').startOf('month');
        const to = from.clone().endOf('month');

        const report: any = await this.profitLoss.profitLossSheet({
          fromDate: from.format('YYYY-MM-DD'),
          toDate: to.format('YYYY-MM-DD'),
        } as any);

        const income = this.nodeTotal(
          report?.data ?? [],
          ProfitLossAggregateNodeId.INCOME,
        );
        const expenses = this.nodeTotal(
          report?.data ?? [],
          ProfitLossAggregateNodeId.EXPENSES,
        );

        return { month, first: income, second: income - expenses };
      }),
    );
    return points;
  }

  /** ДДС: поступления и выплаты по месяцам — по денежным счетам. */
  private async cashFlowPoints(months: string[]): Promise<ReportChartPoint[]> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', [ACCOUNT_TYPE.BANK, ACCOUNT_TYPE.CASH])
      .where('active', true);

    const accountIds = accounts.map((account: any) => account.id);

    if (accountIds.length === 0) {
      return months.map((month) => ({ month, first: 0, second: 0 }));
    }

    const points = await Promise.all(
      months.map(async (month) => {
        const from = moment(month, 'YYYY-MM').startOf('month');
        const to = from.clone().endOf('month');

        const totals: any = await this.transactionModel()
          .query()
          .whereIn('accountId', accountIds)
          .where('date', '>=', from.format('YYYY-MM-DD'))
          .where('date', '<=', to.format('YYYY-MM-DD'))
          .sum('debit as debit')
          .sum('credit as credit')
          .first();

        return {
          month,
          // Приход лежит в дебете денежного счёта, расход — в кредите.
          first: Number(totals?.debit ?? 0),
          second: Number(totals?.credit ?? 0),
        };
      }),
    );
    return points;
  }

  /** Сумма узла отчёта по его имени. */
  private nodeTotal(nodes: any[], id: string): number {
    for (const node of nodes ?? []) {
      if (node?.id === id) return Number(node?.total?.amount ?? 0);

      const found = this.nodeTotal(node?.children ?? [], id);
      if (found) return found;
    }
    return 0;
  }
}
