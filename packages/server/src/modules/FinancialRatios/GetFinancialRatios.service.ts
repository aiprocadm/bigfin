import { Injectable } from '@nestjs/common';
import * as moment from 'moment';
import {
  computeRatios,
  verticalAnalysis,
  horizontalAnalysis,
  FinancialRatios,
  VerticalRow,
  HorizontalRow,
} from './computeRatios';
import { findNodeTotal } from './findNodeTotal';
import { BalanceSheetInjectable } from '@/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetInjectable';
import { ProfitLossSheetService } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheetService';

export interface FinancialRatiosMeta {
  /** Метод учёта, которым посчитан ОПиУ (всегда начисление, см. ниже). */
  basis: 'accrual';
  /** Дата, на которую взяты балансовые остатки. */
  asOf: string;
  fromDate: string;
  toDate: string;
  /** Предыдущий период такой же длины — база горизонтального анализа. */
  previousFromDate: string;
  previousToDate: string;
}

export interface FinancialRatiosResult {
  ratios: FinancialRatios;
  vertical: VerticalRow[];
  horizontal: HorizontalRow[];
  meta: FinancialRatiosMeta;
}

/**
 * Собирает агрегаты из Баланса и ОПиУ за период и считает финансовые
 * коэффициенты (㉕), вертикальный анализ ОПиУ (доля разделов от выручки)
 * и горизонтальный анализ (динамика к предыдущему периоду).
 */
@Injectable()
export class GetFinancialRatiosService {
  constructor(
    private readonly balanceSheet: BalanceSheetInjectable,
    private readonly profitLoss: ProfitLossSheetService,
  ) {}

  /**
   * @param {string} fromDate
   * @param {string} toDate
   */
  public async getRatios(
    fromDate: string,
    toDate: string,
  ): Promise<FinancialRatiosResult> {
    const { previousFromDate, previousToDate } = this.previousPeriod(
      fromDate,
      toDate,
    );

    const balanceSheetPromise = this.balanceSheet.balanceSheet({
      fromDate,
      toDate,
    } as any);

    // Два расчёта ОПиУ (текущий и предыдущий период) идут ПОСЛЕДОВАТЕЛЬНО:
    // хранилище отчёта помнит фильтр между вызовами (setFilter + инициализация),
    // и параллельный запуск затирает состояние первого расчёта — на приёмке ㉕
    // это давало пустой отчёт и нули во всех показателях «от прибыли».
    //
    // Метод учёта задаём явно: Баланс всегда по начислению, а ОПиУ при
    // включённом флаге accrual_pnl по умолчанию кассовый — ROE тогда считался
    // бы от кассовой прибыли к начисленному капиталу.
    const pl = await this.profitLoss.profitLossSheet({
      fromDate,
      toDate,
      basis: 'accrual',
    } as any);
    const plPrev = await this.profitLoss.profitLossSheet({
      fromDate: previousFromDate,
      toDate: previousToDate,
      basis: 'accrual',
    } as any);

    const bs = await balanceSheetPromise;

    const bsData = (bs as any)?.data ?? [];
    const plData = (pl as any)?.data ?? [];
    const plPrevData = (plPrev as any)?.data ?? [];

    const revenue = findNodeTotal(plData, 'INCOME');
    const netIncome = findNodeTotal(plData, 'NET_INCOME');

    const ratios = computeRatios({
      totalAssets: findNodeTotal(bsData, 'ASSETS'),
      totalLiabilities: findNodeTotal(bsData, 'LIABILITY'),
      equity: findNodeTotal(bsData, 'EQUITY'),
      currentAssets: findNodeTotal(bsData, 'CURRENT_ASSETS'),
      currentLiabilities: findNodeTotal(bsData, 'CURRENT_LIABILITY'),
      inventory: findNodeTotal(bsData, 'INVENTORY'),
      revenue,
      netIncome,
    });

    const lines = this.topLevelLines(plData);

    // Вертикальный анализ: доля верхнеуровневых разделов ОПиУ от выручки.
    const vertical = verticalAnalysis(lines, revenue);

    // Горизонтальный анализ: те же разделы против предыдущего периода.
    const previousByKey = new Map<string, number>(
      this.topLevelLines(plPrevData).map((l) => [l.key, l.amount]),
    );
    const horizontal = horizontalAnalysis(lines, previousByKey);

    return {
      ratios,
      vertical,
      horizontal,
      meta: {
        basis: 'accrual',
        asOf: toDate,
        fromDate,
        toDate,
        previousFromDate,
        previousToDate,
      },
    };
  }

  /** Верхнеуровневые разделы ОПиУ в виде строк {key,label,amount}. */
  private topLevelLines(plData: any[]) {
    return (plData ?? []).map((n: any) => ({
      key: n.id,
      label: n.name,
      amount: n?.total?.amount ?? 0,
    }));
  }

  /**
   * Предыдущий период такой же длины, вплотную к текущему:
   * [from−N; from−1 день], где N — длина текущего периода.
   */
  private previousPeriod(fromDate: string, toDate: string) {
    const from = moment(fromDate);
    const to = moment(toDate);
    const days = Math.max(to.diff(from, 'days'), 0);
    const previousTo = from.clone().subtract(1, 'day');
    const previousFrom = previousTo.clone().subtract(days, 'days');
    return {
      previousFromDate: previousFrom.format('YYYY-MM-DD'),
      previousToDate: previousTo.format('YYYY-MM-DD'),
    };
  }
}
