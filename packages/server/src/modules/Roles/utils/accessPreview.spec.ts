// © 2026 Bigfin
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationGuard } from '../Authorization.guard';
import { ABILITIES_CACHE } from '../TenantAbilities';
import { RolesController } from '../Roles.controller';
import { REQUIRE_OWNER_KEY } from '../RequireOwner.decorator';
import { OwnerGuard } from '../Owner.guard';
import {
  ACCESS_PREVIEW_HEADER,
  assertPreviewReadOnly,
  resolveAccessPreview,
} from './accessPreview';

/**
 * FT-081 ТЗ-3: «посмотреть, что видит этот пользователь».
 * AC: в режиме проверки любые мутации возвращают 403.
 */
const OWNER = { id: 1, systemUserId: 100, role: { slug: 'admin', permissions: [] } };
const STAFF = {
  id: 2,
  systemUserId: 200,
  email: 'anna@example.org',
  fullName: 'Анна Кассир',
  role: { slug: 'staff', permissions: [{ subject: 'Cashflow', ability: 'View', value: true }] },
};

function fakeCls(userId: number) {
  const store: Record<string, any> = { userId, organizationId: 'org-1' };
  return { get: (key: string) => store[key], set: (key: string, value: any) => (store[key] = value) } as any;
}

function fakeUsers(calls: { n: number } = { n: 0 }) {
  const users = [OWNER, STAFF];
  return () => ({
    query: () => {
      calls.n += 1;
      const q: any = {
        findOne: (_col: string, systemUserId: number) => {
          q.row = users.find((u) => u.systemUserId === systemUserId);
          return q;
        },
        findById: async (id: number) => users.find((u) => u.id === id),
        withGraphFetched: () => q,
        then: (resolve: any, reject: any) => Promise.resolve(q.row).then(resolve, reject),
      };
      return q;
    },
  });
}

const request = (target?: number, method = 'GET') => ({
  method,
  headers: target ? { [ACCESS_PREVIEW_HEADER]: String(target) } : {},
});

describe('режим проверки доступа', () => {
  beforeEach(() => ABILITIES_CACHE.reset());

  it('без заголовка режима нет', async () => {
    expect(await resolveAccessPreview(request(), fakeCls(100), fakeUsers())).toBeNull();
  });

  it('владелец смотрит глазами сотрудника; ответ запоминается на весь запрос', async () => {
    const calls = { n: 0 };
    const cls = fakeCls(100);
    const preview = await resolveAccessPreview(request(2), cls, fakeUsers(calls));
    expect(preview).toEqual({ systemUserId: 200, tenantUserId: 2, name: 'Анна Кассир' });
    const before = calls.n;
    await resolveAccessPreview(request(2), cls, fakeUsers(calls));
    expect(calls.n).toBe(before);
  });

  it('не администратор включить режим не может', async () => {
    await expect(resolveAccessPreview(request(1), fakeCls(200), fakeUsers())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('несуществующий сотрудник — отказ', async () => {
    await expect(resolveAccessPreview(request(99), fakeCls(100), fakeUsers())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('AC: любое изменение в режиме — 403; чтение — можно', () => {
    const preview = { systemUserId: 200, tenantUserId: 2, name: 'Анна' };
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(() => assertPreviewReadOnly(preview, method)).toThrow(ForbiddenException);
    }
    expect(() => assertPreviewReadOnly(preview, 'GET')).not.toThrow();
    expect(() => assertPreviewReadOnly(null, 'POST')).not.toThrow();
  });

  it('права в режиме — сотрудника, а не владельца', async () => {
    const guard = new AuthorizationGuard(fakeCls(100), fakeUsers() as any);
    const req: any = request(2);
    const context: any = { switchToHttp: () => ({ getRequest: () => req }) };
    await guard.canActivate(context);
    expect(req.ability.can('View', 'Cashflow')).toBe(true);
    expect(req.ability.can('manage', 'all')).toBe(false);

    const ownerReq: any = request();
    await new AuthorizationGuard(fakeCls(100), fakeUsers() as any).canActivate({
      switchToHttp: () => ({ getRequest: () => ownerReq }),
    } as any);
    expect(ownerReq.ability.can('manage', 'all')).toBe(true);
  });
});

describe('начать проверку доступа может только владелец', () => {
  it('ручка стоит в классе ролей под стражем владельца', () => {
    // Пометка класса действует на каждую ручку: отдельная на методе не нужна,
    // но снять её с класса — значит открыть режим всем.
    expect(Reflect.getMetadata(REQUIRE_OWNER_KEY, RolesController)).toBe(true);
    expect(Reflect.getMetadata('__guards__', RolesController)).toContain(OwnerGuard);
    expect(typeof RolesController.prototype.startAccessPreview).toBe('function');
  });
});
