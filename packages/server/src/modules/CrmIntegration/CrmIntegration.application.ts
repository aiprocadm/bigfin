import { ForbiddenException, Injectable } from '@nestjs/common';
import { CrmSettingsService } from './CrmSettings.service';
import { CrmSyncService } from './commands/CrmSync.service';
import { Bitrix24ApiService } from './connectors/bitrix24/Bitrix24Api.service';
import { CrmSyncResult } from './types';
import { BITRIX24_KEY } from './constants';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

/**
 * Прикладной слой CRM-интеграции (⑯a). Гейтит фичу флагом `crm_integration`,
 * оркестрирует подключение Битрикс24 и запуск синхронизации.
 */
@Injectable()
export class CrmIntegrationApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: CrmSettingsService,
    private readonly sync: CrmSyncService,
    private readonly bitrixApi: Bitrix24ApiService,
  ) {}

  /** Статус подключения CRM (для UI). */
  public async status(): Promise<{ activeConnector: string | null; bitrix24Connected: boolean }> {
    await this.assertEnabled();
    const activeConnector = await this.settings.getActiveConnector();
    const bitrix24Connected = Boolean(
      await this.settings.getBitrix24WebhookUrl(),
    );
    return { activeConnector, bitrix24Connected };
  }

  /** Подключает Битрикс24: валидирует webhook пробным вызовом, сохраняет. */
  public async connectBitrix24(webhookUrl: string): Promise<{ connected: true }> {
    await this.assertEnabled();
    // Лёгкая проверка валидности webhook (один запрос, бросит при 401/403).
    await this.bitrixApi.ping(webhookUrl);
    await this.settings.setBitrix24WebhookUrl(webhookUrl);
    return { connected: true };
  }

  /** Отключает Битрикс24. */
  public async disconnectBitrix24(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearBitrix24();
    return { connected: false };
  }

  /** Запускает синхронизацию активного коннектора (по умолчанию Битрикс24). */
  public async runSync(): Promise<CrmSyncResult> {
    await this.assertEnabled();
    const connectorKey =
      (await this.settings.getActiveConnector()) || BITRIX24_KEY;
    return this.sync.sync(connectorKey);
  }

  /** Серверный гейт флага фичи. */
  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(
      Features.CRM_INTEGRATION,
    );
    if (!enabled) {
      throw new ForbiddenException('CRM-интеграция выключена');
    }
  }
}
