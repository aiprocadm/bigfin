// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { MetricValue, computeBreakEven } from '../utils/financialMath';

export interface BreakEvenResult {
  revenue: number;
  margin: number; // доля 0..1
  fixedCosts: number; // Σ собственных сумм постоянных расходных статей
  breakEven: MetricValue; // выручка безубыточности; applicable=false при марже ≤ 0
  hasFixedArticles: boolean; // помечена ли хоть одна статья как постоянная
}

/**
 * Точка безубыточности за период. Выручка/маржа — свёртка статей всей фирмы
 * (как в обзоре). Постоянные затраты = сумма СОБСТВЕННЫХ (own) сумм расходных
 * статей с cost_behavior='fixed' — берём getOwnAmounts, а не getRollup, чтобы
 * пометка и родителя, и потомка не задвоила сумму. Формула — в чистой функции
 * computeBreakEven (покрыта тестами).
 */
@Injectable()
export class GetBreakEvenService {
  constructor(private readonly rollup: ArticlesPlRollupService) {}

  public async getBreakEven(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<BreakEvenResult> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    const rolled = await this.rollup.getRollup({ fromDate, toDate } as any);
    const { revenue, margin } = computeDealMargin(rolled as any);

    const own = await this.rollup.getOwnAmounts({ fromDate, toDate } as any);
    const fixedRows = own.filter(
      (r: any) => r.kind === 'expense' && r.costBehavior === 'fixed',
    );
    const fixedCosts =
      Math.round(
        fixedRows.reduce((s: number, r: any) => s + (r.amount ?? 0), 0) * 100,
      ) / 100;

    return {
      revenue,
      margin,
      fixedCosts,
      breakEven: computeBreakEven(fixedCosts, margin),
      hasFixedArticles: fixedRows.length > 0,
    };
  }
}
