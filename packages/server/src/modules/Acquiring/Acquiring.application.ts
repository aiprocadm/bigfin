import { ForbiddenException, Injectable } from '@nestjs/common';
import { AcquiringSettingsService } from './AcquiringSettings.service';
import { YookassaApiService } from './connectors/yookassa/YookassaApi.service';
import {
  aggregateYookassaPayments,
  AcquiringSummary,
} from './connectors/yookassa/aggregateYookassa';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

/**
 * Прикладной слой эквайринга (⑨d). Флаг `acquiring`. MVP — YooKassa: подключение
 * + read-only сводка (выручка/комиссия/к зачислению) за период. Запись в учёт по
 * статьям (комиссии эквайринга → ГЛ) — отдельное бух-решение.
 */
@Injectable()
export class AcquiringApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: AcquiringSettingsService,
    private readonly api: YookassaApiService,
  ) {}

  public async status(): Promise<{ yookassaConnected: boolean }> {
    await this.assertEnabled();
    const { shopId, secretKey } = await this.settings.getYookassa();
    return { yookassaConnected: Boolean(shopId && secretKey) };
  }

  public async connectYookassa(
    shopId: string,
    secretKey: string,
  ): Promise<{ connected: true }> {
    await this.assertEnabled();
    await this.api.ping(shopId, secretKey);
    await this.settings.setYookassa(shopId, secretKey);
    return { connected: true };
  }

  public async disconnectYookassa(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearYookassa();
    return { connected: false };
  }

  public async yookassaSummary(
    from: string,
    to: string,
  ): Promise<AcquiringSummary> {
    await this.assertEnabled();
    const { shopId, secretKey } = await this.settings.getYookassa();
    if (!shopId || !secretKey) {
      return { gross: 0, net: 0, commission: 0, count: 0 };
    }
    const payments = await this.api.listPayments(shopId, secretKey, from, to);
    return aggregateYookassaPayments(payments);
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(Features.ACQUIRING);
    if (!enabled) throw new ForbiddenException('Эквайринг выключен');
  }
}
