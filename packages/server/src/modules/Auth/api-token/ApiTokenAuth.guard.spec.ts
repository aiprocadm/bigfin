// © 2026 Bigfin
import { hashToken } from '@/modules/PublicApi/utils/apiTokens';
import { ApiTokenAuthGuard, bearerApiToken } from './ApiTokenAuth.guard';

/**
 * FT-091 ТЗ-3: страж входа по токену `bgf_…`. До этапа 39 проверка токена
 * была написана, но не вызывалась никем.
 */
function makeGuard(token: any, scope: string | undefined = 'reports:read') {
  const cls = new Map<string, any>();
  const patched: any[] = [];
  const tokenModel: any = {
    query: () => ({
      findOne: async ({ tokenHash }: any) => (token && tokenHash === token.tokenHash ? token : undefined),
      patchAndFetchById: (id: number, data: any) => {
        patched.push({ id, ...data });
        return Promise.resolve();
      },
    }),
  };
  const tenantModel: any = { query: () => ({ findById: async (id: number) => (id === 7 ? { id: 7, organizationId: 'org-7' } : null) }) };
  const reflector: any = { getAllAndOverride: () => scope };
  const guard = new ApiTokenAuthGuard(tokenModel, tenantModel, reflector, { set: (k: string, v: any) => cls.set(k, v) } as any);
  const context = (header: string, organization?: string) => {
    const request: any = { headers: { authorization: header, ...(organization ? { 'organization-id': organization } : {}) } };
    return { request, ctx: { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => null, getClass: () => null } as any };
  };
  return { guard, cls, patched, context };
}

const raw = 'bgf_' + 'a'.repeat(64);
const stored = (extra: Record<string, any> = {}) => ({
  id: 3,
  tenantId: 7,
  userId: 11,
  tokenHash: hashToken(raw),
  scopes: JSON.stringify(['reports:read']),
  revokedAt: null,
  expiresAt: null,
  ...extra,
});

describe('страж входа по токену API', () => {
  it('принятый токен ставит организацию, владельца и права токена', async () => {
    const { guard, cls, patched, context } = makeGuard(stored());
    const { request, ctx } = context(`Bearer ${raw}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect([cls.get('organizationId'), cls.get('userId'), cls.get('apiTokenScopes')]).toEqual(['org-7', 11, ['reports:read']]);
    expect(request.user).toEqual({ id: 11, apiTokenId: 3 });
    expect(patched[0]).toMatchObject({ id: 3 });
  });

  it('отозванный — 403, чужой — 401, без права — 403', async () => {
    const revoked = makeGuard(stored({ revokedAt: '2026-09-01' }));
    await expect(revoked.guard.canActivate(revoked.context(`Bearer ${raw}`).ctx)).rejects.toMatchObject({ status: 403 });
    const unknown = makeGuard(stored());
    await expect(unknown.guard.canActivate(unknown.context(`Bearer bgf_${'b'.repeat(64)}`).ctx)).rejects.toMatchObject({ status: 401 });
    const noScope = makeGuard(stored(), 'transactions:write');
    await expect(noScope.guard.canActivate(noScope.context(`Bearer ${raw}`).ctx)).rejects.toMatchObject({
      status: 403,
      response: { errors: [expect.objectContaining({ type: 'API_SCOPE_MISSING' })] },
    });
  });

  it('заголовок организации, отличный от организации токена, — 403', async () => {
    const { guard, context } = makeGuard(stored());
    await expect(guard.canActivate(context(`Bearer ${raw}`, 'org-8').ctx)).rejects.toMatchObject({ status: 403 });
  });

  it('узнаёт токен в заголовке, остальное — не токен API', () => {
    expect(bearerApiToken(`Bearer ${raw}`)).toBe(raw);
    expect(bearerApiToken('Bearer eyJhbGciOi')).toBeNull();
    expect(bearerApiToken('bc_legacy')).toBeNull();
  });
});
