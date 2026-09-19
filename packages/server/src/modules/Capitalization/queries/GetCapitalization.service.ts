// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { BalanceSheetInjectable } from '@/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetInjectable';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { LegalEntity } from '@/modules/LegalEntities/models/LegalEntity.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import {
  MetricValue,
  buildValueDrivers,
  computeMultipleValuation,
  computeNetAssets,
  computeOwnerValue,
  type ValueDriver,
} from '../utils/capitalizationMath';
import { readBalanceTotals } from '../utils/readBalanceTotals';
import { CapitalizationSettingsService } from '../CapitalizationSettings.service';

export interface CapitalizationResult {
  fromDate: string;
  toDate: string;

  assets: number;
  liabilities: number;
  /** Чем владеем минус кому должны. Может быть отрицательным — это сигнал. */
  netAssets: number;
  /** Отчёт вообще построился. Нет — показывать нечего. */
  hasBalance: boolean;

  /** Прибыль за период — основа оценки по мультипликатору. */
  profit: number;
  /** Множитель прибыли из настроек; `null` — не задан. */
  profitMultiple: number | null;
  multipleValuation: MetricValue;

  /** Доля владельца в процентах из головного юрлица. */
  ownershipSharePercent: number | null;
  ownerValue: MetricValue;

  drivers: ValueDriver[];
}

/**
 * «Сколько стоит мой бизнес» — главный отчёт собственника (этап 11 ТЗ).
 *
 * Ни одно число здесь не считается заново: активы и обязательства берутся из
 * БАЛАНСА, прибыль — из той же свёртки статей, что и финансовый обзор, доля
 * владельца — из справочника юрлиц. Иначе один и тот же бизнес показывал бы
 * разные числа на разных страницах, и владелец перестал бы верить обеим.
 *
 * Оценка бизнеса — место, где легче всего нарисовать красивое число, которое
 * ничего не значит. Поэтому каждый способ оценки умеет сказать «так считать
 * нельзя»: убыточный бизнес не оценивается по мультипликатору, а без
 * настроенного множителя оценки нет вовсе.
 */
@Injectable()
export class GetCapitalizationService {
  constructor(
    private readonly balanceSheet: BalanceSheetInjectable,
    private readonly rollup: ArticlesPlRollupService,
    private readonly settings: CapitalizationSettingsService,

    @Inject(LegalEntity.name)
    private readonly legalEntityModel: TenantModelProxy<typeof LegalEntity>,
  ) {}

  public async getCapitalization(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<CapitalizationResult> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    const balance = await this.readBalance(fromDate, toDate);
    const profit = await this.readProfit(fromDate, toDate);
    const { profitMultiple } = await this.settings.getSettings();
    const ownershipSharePercent = await this.readOwnershipShare();

    const netAssets = computeNetAssets(balance.assets, balance.liabilities);

    const multipleValuation = computeMultipleValuation(
      profit,
      profitMultiple ?? 0,
    );

    // Доля владельца считается от той оценки, которая ПРИМЕНИМА: если
    // мультипликатор посчитать нельзя, берём чистые активы. Показать долю
    // от нуля значило бы сказать «ваша доля стоит 0 ₽» там, где оценки
    // просто нет.
    const companyValue = multipleValuation.applicable
      ? multipleValuation.value
      : netAssets;

    const ownerValue =
      ownershipSharePercent == null
        ? { value: 0, applicable: false }
        : computeOwnerValue(companyValue, ownershipSharePercent);

    return {
      fromDate,
      toDate,
      assets: balance.assets,
      liabilities: balance.liabilities,
      netAssets,
      hasBalance: balance.found,
      profit,
      profitMultiple,
      multipleValuation,
      ownershipSharePercent,
      ownerValue,
      drivers: buildValueDrivers({
        assets: balance.assets,
        liabilities: balance.liabilities,
        profit,
      }),
    };
  }

  /** Активы и обязательства — из отчёта «Баланс» на конец периода. */
  private async readBalance(fromDate: string, toDate: string) {
    const report = await this.balanceSheet.balanceSheet({
      fromDate,
      toDate,
    } as any);

    return readBalanceTotals((report as any)?.data ?? []);
  }

  /** Прибыль — из той же свёртки статей, что и финансовый обзор. */
  private async readProfit(fromDate: string, toDate: string): Promise<number> {
    const rows = await this.rollup.getRollup({ fromDate, toDate } as any);
    const { profit } = computeDealMargin(rows as any);

    return Number(profit ?? 0);
  }

  /**
   * Доля владельца — из головного юрлица.
   *
   * `null`, когда справочник пуст: доля «0%» и «неизвестно» — разные вещи,
   * и вторую нельзя показывать первой.
   */
  private async readOwnershipShare(): Promise<number | null> {
    const primary = await this.legalEntityModel()
      .query()
      .orderBy('isPrimary', 'desc')
      .orderBy('id', 'asc')
      .first();

    if (!primary) return null;

    const share = Number((primary as any).ownershipShare);

    return Number.isFinite(share) ? share : null;
  }
}
