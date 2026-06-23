import { ForbiddenException, Injectable } from '@nestjs/common';
import { ZenmoneyImportSettingsService } from './ZenmoneyImportSettings.service';
import { ZenmoneyApiService } from './ZenmoneyApi.service';
import {
  ZenmoneyImportResult,
  ZenmoneyImportService,
} from './ZenmoneyImport.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

/**
 * Прикладной слой импорта Дзенмани (⑨b). Флаг `zenmoney_import`. Подключение +
 * импорт операций в конвейер «Разбор» ⑨.
 */
@Injectable()
export class ZenmoneyImportApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: ZenmoneyImportSettingsService,
    private readonly api: ZenmoneyApiService,
    private readonly importer: ZenmoneyImportService,
  ) {}

  public async status(): Promise<{ connected: boolean }> {
    await this.assertEnabled();
    return { connected: Boolean(await this.settings.getToken()) };
  }

  public async connect(token: string): Promise<{ connected: true }> {
    await this.assertEnabled();
    await this.api.ping(token);
    await this.settings.setToken(token);
    return { connected: true };
  }

  public async disconnect(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearToken();
    return { connected: false };
  }

  public async importInto(
    accountId: number,
    currencyCode: string,
  ): Promise<ZenmoneyImportResult> {
    await this.assertEnabled();
    return this.importer.import(accountId, currencyCode || 'RUB');
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(
      Features.ZENMONEY_IMPORT,
    );
    if (!enabled) throw new ForbiddenException('Импорт Дзенмани выключен');
  }
}
