import { ForbiddenException, Injectable } from '@nestjs/common';
import { BankApiSyncSettingsService } from './BankApiSyncSettings.service';
import { BankConnectorsRegistry } from './connectors/BankConnectors.registry';
import {
  BankApiImportResult,
  ImportBankStatementService,
} from './commands/ImportBankStatement.service';
import {
  BankCredentials,
  BankProviderId,
  isBankProviderId,
} from './connectors/BankProvider.types';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { ServiceError } from '@/modules/Items/ServiceError';

export const BANK_API_ERRORS = {
  UNKNOWN_PROVIDER: 'BANK_UNKNOWN_PROVIDER',
  INVALID_CREDENTIALS_SHAPE: 'BANK_INVALID_CREDENTIALS_SHAPE',
};

export interface BankApiStatus {
  connected: Record<BankProviderId, boolean>;
  /** Алиас для фронта, задеплоенного до мультипровайдерности. */
  tinkoffConnected: boolean;
}

/**
 * Прикладной слой банковских API (⑨c). Флаг `bank_api_sync`. Банк —
 * параметр: коннекторы берутся из реестра, учётные данные — из настроек
 * тенанта. Волна 1: Тинькофф, Альфа-Банк.
 */
@Injectable()
export class BankApiSyncApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: BankApiSyncSettingsService,
    private readonly registry: BankConnectorsRegistry,
    private readonly importStatement: ImportBankStatementService,
  ) {}

  public async status(): Promise<BankApiStatus> {
    await this.assertEnabled();
    const connected = await this.settings.listConnected();

    return { connected, tinkoffConnected: connected.tinkoff };
  }

  public async connect(
    provider: string,
    payload: Record<string, unknown>,
  ): Promise<{ connected: true }> {
    await this.assertEnabled();
    const id = this.assertProvider(provider);
    const credentials = this.buildCredentials(id, payload);

    // Учётные данные сохраняем только после успешной проверки в банке.
    await this.registry.get(id).ping(credentials);
    await this.settings.setCredentials(id, credentials);

    return { connected: true };
  }

  public async disconnect(provider: string): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearCredentials(this.assertProvider(provider));

    return { connected: false };
  }

  public async importStatementFor(
    provider: string,
    accountId: number,
    accountNumber: string,
    currencyCode: string,
    from: string,
    to: string,
  ): Promise<BankApiImportResult> {
    await this.assertEnabled();

    return this.importStatement.import(
      this.assertProvider(provider),
      accountId,
      accountNumber,
      currencyCode || 'RUB',
      from,
      to,
    );
  }

  private assertProvider(provider: string): BankProviderId {
    if (!isBankProviderId(provider)) {
      throw new ServiceError(BANK_API_ERRORS.UNKNOWN_PROVIDER);
    }
    return provider;
  }

  /** Форма учётных данных зависит от банка: токен либо OAuth-приложение. */
  private buildCredentials(
    provider: BankProviderId,
    payload: Record<string, unknown>,
  ): BankCredentials {
    if (provider === 'tinkoff') {
      const token = String(payload?.token ?? '').trim();
      if (!token) {
        throw new ServiceError(BANK_API_ERRORS.INVALID_CREDENTIALS_SHAPE);
      }
      return { kind: 'token', token };
    }
    const clientId = String(payload?.clientId ?? '').trim();
    const clientSecret = String(payload?.clientSecret ?? '').trim();
    const refreshToken = String(payload?.refreshToken ?? '').trim();

    if (!clientId || !clientSecret || !refreshToken) {
      throw new ServiceError(BANK_API_ERRORS.INVALID_CREDENTIALS_SHAPE);
    }
    return { kind: 'oauth', clientId, clientSecret, refreshToken };
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(
      Features.BANK_API_SYNC,
    );
    if (!enabled) {
      throw new ForbiddenException('Синхронизация по банк-API выключена');
    }
  }
}
