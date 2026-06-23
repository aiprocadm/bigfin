import { randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CrmWebhookToken } from '../models/CrmWebhookToken';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

/**
 * Выдаёт (или возвращает существующий) токен входящего webhook собственной CRM
 * для текущей организации (⑯c). Токен кладётся в системную таблицу.
 */
@Injectable()
export class GenerateCrmWebhookService {
  constructor(
    @Inject(CrmWebhookToken.name)
    private readonly crmWebhookTokenModel: typeof CrmWebhookToken,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /** Возвращает токен webhook текущей организации (создаёт при отсутствии). */
  public async getOrCreateToken(): Promise<string> {
    const tenant = await this.tenancyContext.getTenant();

    const existing = await this.crmWebhookTokenModel
      .query()
      .findOne({ tenantId: tenant.id });
    if (existing) return existing.token;

    const token = randomBytes(24).toString('hex');
    await this.crmWebhookTokenModel
      .query()
      .insert({ tenantId: tenant.id, token } as any);
    return token;
  }
}
