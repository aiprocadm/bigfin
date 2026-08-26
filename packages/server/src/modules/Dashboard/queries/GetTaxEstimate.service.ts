// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { ProfitLossSheetService } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheetService';
import { ProfitLossAggregateNodeId } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheet.types';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  estimateSimplifiedTax,
  SimplifiedTaxEstimate,
} from './estimateSimplifiedTax';

@Injectable()
export class GetTaxEstimateService {
  constructor(
    private readonly profitLossSheet: ProfitLossSheetService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Н3 карты v22. Оценка налога на упрощёнке за текущий квартал.
   *
   * Доход и расход берём из отчёта о прибылях и убытках по КАССОВОМУ методу
   * — том же, что показывает раздел «Прибыли и убытки». Второго способа
   * считать те же суммы быть не должно: иначе главная и отчёт разойдутся.
   * Кассовый метод здесь не прихоть: упрощёнка считается именно по
   * поступлениям денег.
   *
   * `null` означает «оценки нет»: организация не на упрощёнке, режим не
   * задан или отчёт недоступен. Тогда плитка просто не показывается —
   * молчание честнее выдуманной цифры.
   */
  public async getTaxEstimate(
    today: string,
  ): Promise<SimplifiedTaxEstimate | null> {
    const metadata = await this.tenancyContext.getTenantMetadata();
    const regime = (metadata as any)?.taxRegime ?? (metadata as any)?.tax_regime;

    // Сначала дешёвая проверка режима: не на упрощёнке — отчёт не строим.
    const dryRun = estimateSimplifiedTax({
      regime,
      income: 0,
      expenses: 0,
      today,
    });
    if (!dryRun) return null;

    try {
      const report = await this.profitLossSheet.profitLossSheet({
        fromDate: dryRun.fromDate,
        toDate: dryRun.toDate,
        basis: 'cash',
      } as any);

      const income = this.totalOf(report?.data, [
        ProfitLossAggregateNodeId.INCOME,
        ProfitLossAggregateNodeId.OTHER_INCOME,
      ]);
      const expenses = this.totalOf(report?.data, [
        ProfitLossAggregateNodeId.COS,
        ProfitLossAggregateNodeId.EXPENSES,
        ProfitLossAggregateNodeId.OTHER_EXPENSES,
      ]);

      return estimateSimplifiedTax({ regime, income, expenses, today });
    } catch (error) {
      // Сводка не должна ронять главную страницу: пустая организация или
      // недоступный отчёт — это отсутствие оценки, а не ошибка на экран.
      console.error('[tax-estimate] profit/loss report failed:', error);
      return null;
    }
  }

  /**
   * Сумма итогов перечисленных разделов отчёта.
   */
  private totalOf(nodes: any[] | undefined, ids: string[]): number {
    if (!nodes?.length) return 0;

    return ids.reduce((sum, id) => {
      const node = nodes.find((item) => item?.id === id);
      const amount = Number(node?.total?.amount ?? 0);

      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }
}
