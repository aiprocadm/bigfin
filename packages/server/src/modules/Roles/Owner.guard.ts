// © 2026 Bigfin
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { UserTenant } from '../System/models/UserTenant.model';
import { TenantModel } from '../System/models/TenantModel';
import { REQUIRE_OWNER_KEY } from './RequireOwner.decorator';

/**
 * Пропускает запрос, только если обратившийся — владелец организации.
 *
 * Пометки нет — страж не вмешивается, как и его соседи `PermissionGuard`
 * и `FeatureGuard`.
 *
 * Владелец берётся из членства в организации (`user_tenants.role`). Это
 * намеренно не роль внутри организации: роль лежит в данных самой организации
 * и меняется её же средствами, а членство — на уровне системы.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    @Inject(UserTenant.name)
    private readonly userTenantModel: typeof UserTenant,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,

    private readonly reflector: Reflector,
    private readonly clsService: ClsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const organizationId = request.headers['organization-id'];
    const userId = this.clsService.get<number>('userId');

    const tenant = await this.tenantModel.query().findOne({ organizationId });

    if (!tenant) {
      throw new ForbiddenException('Организация не найдена');
    }
    const membership = await this.userTenantModel
      .query()
      .findOne({ userId, tenantId: tenant.id });

    if (membership?.role !== 'owner') {
      throw new ForbiddenException(
        'Действие доступно только владельцу организации',
      );
    }
    return true;
  }
}
