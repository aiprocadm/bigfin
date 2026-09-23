// © 2026 Bigfin
import { CanActivate, ExecutionContext, HttpException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { ApiToken } from '@/modules/System/models/ApiToken.model';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { API_SCOPE_KEY } from '@/modules/PublicApi/RequireApiScope.decorator';
import { checkToken, hashToken, TOKEN_PREFIX } from '@/modules/PublicApi/utils/apiTokens';
import { apiTokenDecision } from '@/modules/PublicApi/utils/apiTokenAccess';

/** Токен API из заголовка `Authorization: Bearer bgf_…`; пусто — не токен. */
export function bearerApiToken(header: string | undefined): string | null {
  const value = String(header ?? '').trim().replace(/^bearer\s+/i, '').trim();
  return value.startsWith(TOKEN_PREFIX) ? value : null;
}

const parseScopes = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/**
 * Вход по токену публичного API `bgf_…` (FT-091 ТЗ-3).
 *
 * До этого этапа проверка токена была написана, но НЕ ВЫЗЫВАЛАСЬ НИКЕМ:
 * выпущенный на экране «Публичный API» токен не пускал никуда, а документ
 * описывал работающую схему.
 *
 * Токен работает ОТ ИМЕНИ своего владельца: организация и пользователь
 * берутся из токена, права роли владельца продолжают действовать. Поверх
 * них — права токена: ручка открыта токену, только если на ней стоит
 * `@RequireApiScope(…)` и это право у токена есть.
 */
@Injectable()
export class ApiTokenAuthGuard implements CanActivate {
  constructor(
    @Inject(ApiToken.name)
    private readonly apiTokenModel: typeof ApiToken,
    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const presented = bearerApiToken(request.headers['authorization']) ?? '';

    const stored: any = await this.apiTokenModel.query().findOne({ tokenHash: hashToken(presented) });
    const rejection = checkToken(
      presented,
      stored
        ? { hash: stored.tokenHash, revokedAt: stored.revokedAt, expiresAt: stored.expiresAt, scopes: parseScopes(stored.scopes) }
        : null,
    );
    const tenant: any = stored ? await this.tenantModel.query().findById(stored.tenantId) : null;
    const headerOrganization = request.headers['organization-id'];
    const requiredScope = this.reflector.getAllAndOverride<string>(API_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const decision = apiTokenDecision({
      rejection: rejection ?? (tenant ? null : 'unknown'),
      hasOwner: !!stored?.userId,
      requiredScope,
      scopes: stored ? parseScopes(stored.scopes) : [],
      organizationMatches: !headerOrganization || headerOrganization === tenant?.organizationId,
    });
    if (decision.allow === false) {
      // Единое тело ошибки — как у остальных отказов продукта.
      throw new HttpException(
        { errors: [{ statusCode: decision.status, type: decision.type, message: decision.message }] },
        decision.status,
      );
    }

    this.cls.set('organizationId', tenant.organizationId);
    this.cls.set('userId', stored.userId);
    this.cls.set('apiTokenId', stored.id);
    this.cls.set('apiTokenScopes', parseScopes(stored.scopes));
    request.user = { id: stored.userId, apiTokenId: stored.id };

    // Отметка «пользовались» — чтобы перед отзывом было видно живые токены.
    await this.apiTokenModel
      .query()
      .patchAndFetchById(stored.id, { lastUsedAt: new Date() } as any)
      .catch(() => undefined);
    return true;
  }
}
