import { Injectable } from '@nestjs/common';
import { Bitrix24Connector } from './connectors/bitrix24/Bitrix24Connector';
import { AmoCrmConnector } from './connectors/amocrm/AmoCrmConnector';
import { CrmConnector } from './types';

/**
 * Реестр коннекторов CRM по ключу (зеркалит реестр каналов доставки в уведомлениях).
 * Новый коннектор (собственная CRM ⑯c) добавляется в конструктор и в карту.
 */
@Injectable()
export class CrmConnectorRegistry {
  private readonly registry: Record<string, CrmConnector>;

  constructor(
    private readonly bitrix24: Bitrix24Connector,
    private readonly amocrm: AmoCrmConnector,
  ) {
    this.registry = {
      [this.bitrix24.key]: this.bitrix24,
      [this.amocrm.key]: this.amocrm,
    };
  }

  /** Коннектор по ключу или undefined. */
  public get(key: string): CrmConnector | undefined {
    return this.registry[key];
  }

  /** Все зарегистрированные коннекторы. */
  public all(): CrmConnector[] {
    return Object.values(this.registry);
  }
}
