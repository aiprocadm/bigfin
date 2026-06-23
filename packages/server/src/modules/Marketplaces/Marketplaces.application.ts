import { ForbiddenException, Injectable } from '@nestjs/common';
import { MarketplacesSettingsService } from './MarketplacesSettings.service';
import { WildberriesApiService } from './connectors/wildberries/WildberriesApi.service';
import { WildberriesConnector } from './connectors/wildberries/WildberriesConnector';
import { MarketplaceSummary } from './types';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

/**
 * Прикладной слой интеграции маркетплейсов (⑱). Флаг `marketplaces`. MVP —
 * подключение Wildberries + read-only финансовая сводка за период (выручка за
 * вычетом удержаний). Запись в учёт по статьям («Этап 0») — отдельное решение.
 */
@Injectable()
export class MarketplacesApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: MarketplacesSettingsService,
    private readonly wbApi: WildberriesApiService,
    private readonly wb: WildberriesConnector,
  ) {}

  /** Статус подключения (для UI). */
  public async status(): Promise<{ wildberriesConnected: boolean }> {
    await this.assertEnabled();
    return { wildberriesConnected: Boolean(await this.settings.getWbKey()) };
  }

  /** Подключает Wildberries: валидирует ключ пробным вызовом, сохраняет. */
  public async connectWildberries(apiKey: string): Promise<{ connected: true }> {
    await this.assertEnabled();
    await this.wbApi.ping(apiKey);
    await this.settings.setWbKey(apiKey);
    return { connected: true };
  }

  /** Отключает Wildberries. */
  public async disconnectWildberries(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearWbKey();
    return { connected: false };
  }

  /** Финансовая сводка Wildberries за период (read-only). */
  public async wildberriesSummary(
    fromDate: string,
    toDate: string,
  ): Promise<MarketplaceSummary> {
    await this.assertEnabled();
    return this.wb.fetchSummary(fromDate, toDate);
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(Features.MARKETPLACES);
    if (!enabled) throw new ForbiddenException('Интеграция маркетплейсов выключена');
  }
}
