import {
  IProfitLossSheetQuery,
  IProfitLossSheetMeta,
  IProfitLossSheetNode,
} from './ProfitLossSheet.types';
import ProfitLossSheet from './ProfitLossSheet';
import { mergeQueryWithDefaults } from './utils';
import { ProfitLossSheetRepository } from './ProfitLossSheetRepository';
import { ProfitLossSheetMeta } from './ProfitLossSheetMeta';
import { events } from '@/common/events/events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Features } from '@/common/types/Features';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';

@Injectable()
export class ProfitLossSheetService {
  constructor(
    private readonly profitLossSheetMeta: ProfitLossSheetMeta,
    private readonly eventPublisher: EventEmitter2,
    private readonly i18nService: I18nService,
    private readonly profitLossRepository: ProfitLossSheetRepository,
    private readonly featuresManager: FeaturesManager,
  ) {}

  /**
   * Retrieve profit/loss sheet statement.
   * @param {IProfitLossSheetQuery} query
   * @return { }
   */
  public profitLossSheet = async (
    query: IProfitLossSheetQuery,
  ): Promise<{
    data: IProfitLossSheetNode[];
    query: IProfitLossSheetQuery;
    meta: IProfitLossSheetMeta;
  }> => {
    // Whether the accrual P&L feature is enabled. Flag off — the basis is
    // ignored by the engine (legacy behavior, no regression).
    const isAccrualPnlEnabled = await this.featuresManager.accessible(
      Features.ACCRUAL_PNL,
    );
    // Merges the given query with default filter query.
    const filter = mergeQueryWithDefaults(query, isAccrualPnlEnabled);

    // Loads the profit/loss sheet data.
    this.profitLossRepository.setFilter(filter, {
      cashBasisActive: isAccrualPnlEnabled && filter.basis === 'cash',
    });
    await this.profitLossRepository.asyncInitialize();

    // Retrieve the profit/loss sheet meta first to get date format.
    const meta = await this.profitLossSheetMeta.meta(filter);

    // Profit/Loss report instance.
    const profitLossInstance = new ProfitLossSheet(
      this.profitLossRepository,
      filter,
      this.i18nService,
      { baseCurrency: meta.baseCurrency, dateFormat: meta.dateFormat },
    );
    // Profit/loss report data and columns.
    const data = profitLossInstance.reportData();

    // Triggers `onProfitLossSheetViewed` event.
    await this.eventPublisher.emitAsync(
      events.reports.onProfitLossSheetViewed,
      { query },
    );

    return {
      query: filter,
      data,
      meta,
    };
  };
}
