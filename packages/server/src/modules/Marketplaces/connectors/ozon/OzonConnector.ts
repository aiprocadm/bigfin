import { Injectable } from '@nestjs/common';
import { OzonApiService } from './OzonApi.service';
import { aggregateOzonOperations } from './aggregateOzon';
import { MarketplaceConnector, MarketplaceSummary, emptySummary } from '../../types';
import { MarketplacesSettingsService } from '../../MarketplacesSettings.service';

/**
 * Коннектор Ozon (⑱) — реализация `MarketplaceConnector`. Тянет финансовые
 * операции за период и агрегирует в ту же сводку, что и Wildberries.
 */
@Injectable()
export class OzonConnector implements MarketplaceConnector {
  readonly key = 'ozon';

  constructor(
    private readonly settings: MarketplacesSettingsService,
    private readonly api: OzonApiService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const creds = await this.settings.getOzonCredentials();
    return Boolean(creds);
  }

  public async fetchSummary(
    fromDate: string,
    toDate: string,
  ): Promise<MarketplaceSummary> {
    const creds = await this.settings.getOzonCredentials();
    if (!creds) return emptySummary();

    const operations = await this.api.financeTransactions(
      creds.clientId,
      creds.apiKey,
      fromDate,
      toDate,
    );
    return aggregateOzonOperations(operations);
  }
}
