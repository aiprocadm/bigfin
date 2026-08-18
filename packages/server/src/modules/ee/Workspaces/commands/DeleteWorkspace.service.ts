import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ServiceError } from '@/modules/Items/ServiceError';
import { UserTenant } from '@/modules/System/models/UserTenant.model';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { PlanSubscription } from '@/modules/Subscription/models/PlanSubscription';
import { TenantMetadata } from '@/modules/System/models/TenantMetadataModel';
import { TenantDBManager } from '@/modules/TenantDBManager/TenantDBManager';
import { events } from '@/common/events/events';
import { WorkspacesError } from '../Workspaces.constants';

@Injectable()
export class DeleteWorkspaceService {
  constructor(
    @Inject(UserTenant.name)
    private readonly userTenantModel: typeof UserTenant,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,
    private readonly tenantDBManager: TenantDBManager,
    private readonly eventEmitter: EventEmitter2,

    @Inject(PlanSubscription.name)
    private readonly planSubscriptionModel: typeof PlanSubscription,

    @Inject(TenantMetadata.name)
    private readonly tenantMetadataModel: typeof TenantMetadata,
  ) {}

  /**
   * Deletes a workspace (organization). Only the owner of the workspace
   * is permitted to delete it.
   * - Drops the physical tenant database.
   * - Deletes the tenant row (cascades to user_tenants).
   */
  async deleteWorkspace(userId: number, organizationId: string): Promise<void> {
    const tenant = await this.tenantModel.query().findOne({ organizationId });

    if (!tenant) {
      throw new ServiceError(WorkspacesError.WORKSPACE_NOT_FOUND);
    }
    const membership = await this.userTenantModel
      .query()
      .findOne({ userId, tenantId: tenant.id });

    if (!membership || membership.role !== 'owner') {
      throw new ServiceError(WorkspacesError.NOT_WORKSPACE_OWNER);
    }
    // Drop the physical tenant database if it exists.
    await this.tenantDBManager.dropDatabaseIfExists();

    // Сироты системной базы (С3 карты v14): строка подписки держит удаление
    // тенанта по FK без каскада (организация зависала «удаляется»), а у
    // tenants_metadata FK нет вовсе — оставалась навсегда.
    await this.planSubscriptionModel
      .query()
      .delete()
      .where({ tenantId: tenant.id });
    await this.tenantMetadataModel
      .query()
      .delete()
      .where({ tenantId: tenant.id });

    // Delete the tenant row — cascades to user_tenants via FK.
    await this.tenantModel.query().deleteById(tenant.id);

    // Emit workspace deleted event.
    await this.eventEmitter.emitAsync(events.workspace.deleted, {
      organizationId,
      userId,
      tenantId: tenant.id,
    });
  }
}
