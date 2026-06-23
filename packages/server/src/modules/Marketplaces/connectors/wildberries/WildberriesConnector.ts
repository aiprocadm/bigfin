import { Injectable } from '@nestjs/common';
import { WildberriesApiService } from './WildberriesApi.service';
import { aggregateWbReport } from './aggregateWb';
import { MarketplaceConnector, MarketplaceSummary, emptySummary } from '../../types';
import { MarketplacesSettingsService } from '../../MarketplacesSettings.service';

/**
 * Коннектор Wildberries (⑱) — реализация `MarketplaceConnector`. Тянет
 * детализацию отчёта за период и агрегирует в финансовую сводку.
 */
@Injectable()
export class WildberriesConnector implements MarketplaceConnector {
  readonly key = 'wildberries';

  constructor(
    private readonly settings: MarketplacesSettingsService,
    private readonly api: WildberriesApiService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    return Boolean(await this.settings.getWbKey());
  }

  public async fetchSummary(
    fromDate: string,
    toDate: string,
  ): Promise<MarketplaceSummary> {
    const apiKey = await this.settings.getWbKey();
    if (!apiKey) return emptySummary();

    const rows = await this.api.reportDetailByPeriod(apiKey, fromDate, toDate);
    return aggregateWbReport(rows);
  }
}
