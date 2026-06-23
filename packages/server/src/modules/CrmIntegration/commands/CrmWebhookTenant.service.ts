import { ClsService } from 'nestjs-cls';
import { Inject, Injectable } from '@nestjs/common';
import { CrmWebhookToken } from '../models/CrmWebhookToken';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { SystemUser } from '@/modules/System/models/SystemUser';

/**
 * Разрешает входящий webhook собственной CRM (⑯c) в тенант-контекст по токену
 * и выполняет колбэк в этом контексте (зеркалит `SetupPlaidItemTenant`).
 */
@Injectable()
export class CrmWebhookTenantService {
  constructor(
    private readonly clsService: ClsService,

    @Inject(CrmWebhookToken.name)
    private readonly crmWebhookTokenModel: typeof CrmWebhookToken,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,

    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,
  ) {}

  /**
   * @param {string} token — токен из webhook-запроса.
   * @param {() => T} callback — выполняется в тенант-контексте.
   */
  public async resolveAndRun<T>(token: string, callback: () => T): Promise<T> {
    const record = await this.crmWebhookTokenModel
      .query()
      .findOne({ token })
      .throwIfNotFound();

    const tenant = await this.tenantModel
      .query()
      .findOne({ id: record.tenantId })
      .throwIfNotFound();

    const user = await this.systemUserModel
      .query()
      .findOne({ tenantId: tenant.id })
      .modify('active')
      .throwIfNotFound();

    this.clsService.set('organizationId', tenant.organizationId);
    this.clsService.set('userId', user.id);

    return callback();
  }
}
