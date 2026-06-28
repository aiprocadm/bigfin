import { AsyncLocalStorage } from 'node:async_hooks';
import { ClsService } from 'nestjs-cls';
import { SetupPlaidItemTenantService } from './SetupPlaidItemTenant.service';

/**
 * Covers the cross-tenant isolation fix: the Plaid webhook is a public route
 * without an `organization-id` header, so setting the tenant context must
 * happen inside an isolated CLS child store. The override must NOT leak into
 * the calling request's shared store (cross-tenant isolation risk).
 */
describe('SetupPlaidItemTenantService', () => {
  // Minimal thenable that also exposes the Objection-style chain helpers
  // (`throwIfNotFound`, `modify`) the service calls.
  const queryResult = (value: any) => {
    const p: any = Promise.resolve(value);
    p.throwIfNotFound = () => p;
    p.modify = () => p;
    return p;
  };

  const buildService = (cls: ClsService) => {
    const plaidItem = { tenantId: 7 };
    const tenant = { id: 7, organizationId: 'org-7' };
    const user = { id: 'user-7' };

    const systemPlaidItemModel = {
      query: () => ({ findOne: () => queryResult(plaidItem) }),
    };
    const tenantModel = {
      query: () => ({ findOne: () => queryResult(tenant) }),
    };
    const systemUserModel = {
      query: () => ({ findOne: () => queryResult(user) }),
    };

    return new SetupPlaidItemTenantService(
      cls,
      systemPlaidItemModel as any,
      tenantModel as any,
      systemUserModel as any,
    );
  };

  it('sets the tenant context inside the callback', async () => {
    const cls = new ClsService(new AsyncLocalStorage());
    const service = buildService(cls);

    const seen: Record<string, unknown> = {};
    await cls.run(async () => {
      await service.setupPlaidTenant('item-1', () => {
        seen.organizationId = cls.get('organizationId');
        seen.userId = cls.get('userId');
      });
    });

    expect(seen.organizationId).toBe('org-7');
    expect(seen.userId).toBe('user-7');
  });

  it('does not leak the tenant context into the calling request store', async () => {
    const cls = new ClsService(new AsyncLocalStorage());
    const service = buildService(cls);

    let leakedOrg: unknown = 'unset';
    await cls.run(async () => {
      // Simulate an existing request store (e.g. a concurrent caller).
      cls.set('organizationId', 'caller-org');

      await service.setupPlaidTenant('item-1', () => undefined);

      // After the isolated run, the caller's store must be untouched.
      leakedOrg = cls.get('organizationId');
    });

    expect(leakedOrg).toBe('caller-org');
  });
});
