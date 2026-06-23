import { ForbiddenException, Injectable } from '@nestjs/common';
import { BankApiSyncSettingsService } from './BankApiSyncSettings.service';
import { TinkoffApiService } from './connectors/tinkoff/TinkoffApi.service';
import {
  BankApiImportResult,
  ImportTinkoffStatementService,
} from './commands/ImportTinkoffStatement.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

/**
 * Прикладной слой банковских API (⑨c). Флаг `bank_api_sync`. MVP — Тинькофф:
 * подключение + импорт выписки по API в конвейер «Разбор» ⑨.
 */
@Injectable()
export class BankApiSyncApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: BankApiSyncSettingsService,
    private readonly tinkoffApi: TinkoffApiService,
    private readonly importTinkoff: ImportTinkoffStatementService,
  ) {}

  public async status(): Promise<{ tinkoffConnected: boolean }> {
    await this.assertEnabled();
    return { tinkoffConnected: Boolean(await this.settings.getTinkoffToken()) };
  }

  public async connectTinkoff(token: string): Promise<{ connected: true }> {
    await this.assertEnabled();
    await this.tinkoffApi.ping(token);
    await this.settings.setTinkoffToken(token);
    return { connected: true };
  }

  public async disconnectTinkoff(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearTinkoffToken();
    return { connected: false };
  }

  public async importTinkoffStatement(
    accountId: number,
    accountNumber: string,
    currencyCode: string,
    from: string,
    to: string,
  ): Promise<BankApiImportResult> {
    await this.assertEnabled();
    return this.importTinkoff.import(
      accountId,
      accountNumber,
      currencyCode || 'RUB',
      from,
      to,
    );
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(
      Features.BANK_API_SYNC,
    );
    if (!enabled) throw new ForbiddenException('Синхронизация по банк-API выключена');
  }
}
