import { ForbiddenException, Injectable } from '@nestjs/common';
import { MarketplacesSettingsService } from './MarketplacesSettings.service';
import { WildberriesApiService } from './connectors/wildberries/WildberriesApi.service';
import { WildberriesConnector } from './connectors/wildberries/WildberriesConnector';
import { OzonApiService } from './connectors/ozon/OzonApi.service';
import { OzonConnector } from './connectors/ozon/OzonConnector';
import { MarketplaceSummary } from './types';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

/**
 * Прикладной слой интеграции маркетплейсов (⑱). Флаг `marketplaces`. MVP —
 * подключение Wildberries и Ozon + read-only финансовая сводка за период
 * (выручка за вычетом удержаний). Оба маркетплейса реализуют один интерфейс
 * `MarketplaceConnector`. Запись в учёт по статьям — отдельное решение.
 */
@Injectable()
export class MarketplacesApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: MarketplacesSettingsService,
    private readonly wbApi: WildberriesApiService,
    private readonly wb: WildberriesConnector,
    private readonly ozonApi: OzonApiService,
    private readonly ozon: OzonConnector,
  ) {}

  /** Статус подключения (для UI). */
  public async status(): Promise<{
    wildberriesConnected: boolean;
    ozonConnected: boolean;
  }> {
    await this.assertEnabled();
    return {
      wildberriesConnected: Boolean(await this.settings.getWbKey()),
      ozonConnected: await this.ozon.isConfigured(),
    };
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

  /** Подключает Ozon: валидирует пару ключей пробным вызовом, сохраняет. */
  public async connectOzon(
    clientId: string,
    apiKey: string,
  ): Promise<{ connected: true }> {
    await this.assertEnabled();
    // Сохраняем только после успешной проверки в кабинете продавца.
    await this.ozonApi.ping(clientId, apiKey);
    await this.settings.setOzonCredentials(clientId, apiKey);
    return { connected: true };
  }

  /** Отключает Ozon. */
  public async disconnectOzon(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearOzonCredentials();
    return { connected: false };
  }

  /** Финансовая сводка Ozon за период (read-only). */
  public async ozonSummary(
    fromDate: string,
    toDate: string,
  ): Promise<MarketplaceSummary> {
    await this.assertEnabled();
    return this.ozon.fetchSummary(fromDate, toDate);
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(Features.MARKETPLACES);
    if (!enabled) throw new ForbiddenException('Интеграция маркетплейсов выключена');
  }
}
