// © 2026 Bigfin
import { assertPreviewReadOnly, resolveAccessPreview } from './utils/accessPreview';
import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

import { IS_PUBLIC_ROUTE } from '../Auth/Auth.constants';
import { IS_TENANT_AGNOSTIC } from '../Tenancy/TenancyGlobal.guard';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { TenantUser } from '../Tenancy/TenancyModels/models/TenantUser.model';
import { ABILITIES_CACHE, abilityCacheKey } from './TenantAbilities';
import {
  forbiddenRowScopeRequest,
  ROW_SCOPE_CLS_KEY,
  RowScope,
  rowScopeOfRole,
} from './utils/rowScope';

/** Ключ в общем кеше прав: сбрасывается вместе с правами пользователя. */
export const rowScopeCacheKey = (organizationId: unknown, userId: unknown) =>
  `rowscope|${abilityCacheKey(organizationId, userId)}`;

const DIMENSION_TEXT: Record<string, string> = {
  articleIds: 'статье',
  projectIds: 'направлению',
  accountIds: 'счёту',
  legalEntityIds: 'юрлицу',
};

/**
 * Ограничение роли на каждый запрос (FT-080 ТЗ-3).
 *
 * Перехватчик, а не страж ручек: ограничение должно действовать и там, где
 * у ручки своих прав нет (например, список счетов с остатками). Он узнаёт
 * ограничение роли и кладёт его в память запроса — оттуда его берут модели
 * (`rowScopedQueryBuilder`). Сюда же — отказ на явную просьбу чужого:
 * `?projectId=<чужое>` получает 403, а не пустой отчёт.
 */
@Injectable()
export class RowScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (context.getType() !== 'http' || this.skips(context)) return next.handle();

    const userId = this.cls.get<number>('userId');
    const organizationId = this.cls.get('organizationId');
    if (!userId || !organizationId) return next.handle();

    const request = context.switchToHttp().getRequest();
    // Режим проверки доступа (FT-081 ТЗ-3): смотреть можно, менять — нет.
    const preview = await resolveAccessPreview(request, this.cls, this.tenantUserModel);
    assertPreviewReadOnly(preview, request?.method, request?.originalUrl ?? request?.url);

    const scope = await this.scopeFor(organizationId, preview?.systemUserId ?? userId);
    this.cls.set(ROW_SCOPE_CLS_KEY, scope);

    const forbidden =
      forbiddenRowScopeRequest(request?.query, scope) ??
      forbiddenRowScopeRequest(request?.body, scope);
    if (forbidden) {
      throw new ForbiddenException({
        errors: [
          {
            type: 'ROW_SCOPE_FORBIDDEN',
            message: `Нет доступа к этому ${DIMENSION_TEXT[forbidden]}: его не открыли вашей роли.`,
          },
        ],
      });
    }
    return next.handle();
  }

  private skips(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    return !!(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, targets) ||
      this.reflector.getAllAndOverride<boolean>(IS_TENANT_AGNOSTIC, targets)
    );
  }

  /** Ограничение из роли — с кешем, который сбрасывается с правами. */
  private async scopeFor(organizationId: unknown, userId: number): Promise<RowScope | null> {
    const key = rowScopeCacheKey(organizationId, userId);
    const cached = ABILITIES_CACHE.get(key) as { scope: RowScope | null } | undefined;
    if (cached) return cached.scope;

    const user: any = await this.tenantUserModel()
      .query()
      .findOne('systemUserId', userId)
      .withGraphFetched('role');
    const scope = rowScopeOfRole(user?.role);
    ABILITIES_CACHE.set(key, { scope });
    return scope;
  }
}
