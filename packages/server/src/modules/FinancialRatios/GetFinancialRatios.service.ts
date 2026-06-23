import { Injectable } from '@nestjs/common';
import { computeRatios, verticalAnalysis, FinancialRatios, VerticalRow } from './computeRatios';
import { findNodeTotal } from './findNodeTotal';
import { BalanceSheetInjectable } from '@/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetInjectable';
import { ProfitLossSheetService } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheetService';

export interface FinancialRatiosResult {
  ratios: FinancialRatios;
  vertical: VerticalRow[];
}

/**
 * Собирает агрегаты из Баланса и ОПиУ за период и считает финансовые
 * коэффициенты (㉕) + вертикальный анализ ОПиУ (доля статей от выручки).
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
    const [bs, pl] = await Promise.all([
      this.balanceSheet.balanceSheet({ fromDate, toDate } as any),
      this.profitLoss.profitLossSheet({ fromDate, toDate } as any),
    ]);

    const bsData = (bs as any)?.data ?? [];
    const plData = (pl as any)?.data ?? [];

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

    // Вертикальный анализ: доля верхнеуровневых разделов ОПиУ от выручки.
    const vertical = verticalAnalysis(
      (plData as any[]).map((n) => ({
        key: n.id,
        label: n.name,
        amount: n?.total?.amount ?? 0,
      })),
      revenue,
    );

    return { ratios, vertical };
  }
}
