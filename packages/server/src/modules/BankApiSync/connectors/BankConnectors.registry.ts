import { Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TinkoffApiService } from './tinkoff/TinkoffApi.service';
import { AlfaApiService } from './alfa/AlfaApi.service';
import {
  BankConnector,
  BankProviderId,
  BANK_PROVIDER_IDS,
} from './BankProvider.types';

export const BANK_CONNECTOR_ERRORS = {
  UNKNOWN_PROVIDER: 'BANK_UNKNOWN_PROVIDER',
};

/** Реестр банковских коннекторов: прикладной слой ходит только сюда. */
@Injectable()
export class BankConnectorsRegistry {
  private readonly connectors: Map<BankProviderId, BankConnector>;

  constructor(tinkoff: TinkoffApiService, alfa: AlfaApiService) {
    this.connectors = new Map<BankProviderId, BankConnector>([
      ['tinkoff', tinkoff],
      ['alfa', alfa],
    ]);
  }

  public get(id: BankProviderId): BankConnector {
    const connector = this.connectors.get(id);
    if (!connector) {
      throw new ServiceError(BANK_CONNECTOR_ERRORS.UNKNOWN_PROVIDER);
    }
    return connector;
  }

  public ids(): BankProviderId[] {
    return [...BANK_PROVIDER_IDS];
  }
}
