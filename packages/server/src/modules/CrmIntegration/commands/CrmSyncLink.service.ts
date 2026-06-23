import { Inject, Injectable } from '@nestjs/common';
import { CrmSyncLink } from '../models/CrmSyncLink.model';
import { CrmLinkEntityType } from '../types';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

/**
 * Доступ к таблице `crm_sync_links` — обеспечивает идемпотентность синхронизации:
 * по уже записанным связкам движок понимает, что импортировать, а что пропустить.
 */
@Injectable()
export class CrmSyncLinkService {
  constructor(
    @Inject(CrmSyncLink.name)
    private readonly linkModel: TenantModelProxy<typeof CrmSyncLink>,
  ) {}

  /** Карта externalId → bigfinId для контрагентов данного коннектора. */
  public async getContactIdMap(
    connectorKey: string,
  ): Promise<Map<string, number>> {
    const rows = await this.linkModel()
      .query()
      .where('connectorKey', connectorKey)
      .where('entityType', 'contact')
      .select('externalId', 'entityId');

    return new Map(rows.map((r: any) => [r.externalId, r.entityId]));
  }

  /** Множество externalId уже импортированных сделок данного коннектора. */
  public async getDealExternalIds(connectorKey: string): Promise<Set<string>> {
    const rows = await this.linkModel()
      .query()
      .where('connectorKey', connectorKey)
      .where('entityType', 'deal')
      .select('externalId');

    return new Set(rows.map((r: any) => r.externalId));
  }

  /** Записывает связку «внешняя сущность → сущность Bigfin». */
  public async record(
    connectorKey: string,
    externalId: string,
    entityType: CrmLinkEntityType,
    entityId: number,
  ): Promise<void> {
    await this.linkModel().query().insert({
      connectorKey,
      externalId,
      entityType,
      entityId,
    });
  }
}
