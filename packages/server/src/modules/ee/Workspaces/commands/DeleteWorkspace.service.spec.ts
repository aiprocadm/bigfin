import { DeleteWorkspaceService } from './DeleteWorkspace.service';

/**
 * С3 (карта v14): удаление организации не должно оставлять сироты в
 * системной базе. Раньше: строка подписки держала удаление тенанта по FK
 * без каскада (организация зависала «удаляется»), а tenants_metadata
 * оставалась навсегда (FK у неё нет вовсе).
 */
describe('DeleteWorkspaceService', () => {
  const build = () => {
    const calls: string[] = [];
    const deleteWhere = (tag: string) => ({
      query: () => ({
        delete: () => ({
          where: jest.fn(async () => {
            calls.push(tag);
            return 1;
          }),
        }),
      }),
    });
    const tenant = { id: 7, organizationId: 'org-1' };
    const tenantModel: any = {
      query: () => ({
        findOne: jest.fn(async () => tenant),
        deleteById: jest.fn(async (id: number) => {
          calls.push('tenant');
          return 1;
        }),
      }),
    };
    const userTenantModel: any = {
      query: () => ({
        findOne: jest.fn(async () => ({ role: 'owner' })),
      }),
    };
    const tenantDBManager: any = { dropDatabaseIfExists: jest.fn() };
    const eventEmitter: any = { emitAsync: jest.fn() };
    const planSubscriptionModel: any = deleteWhere('subscriptions');
    const tenantMetadataModel: any = deleteWhere('metadata');

    const service = new DeleteWorkspaceService(
      userTenantModel,
      tenantModel,
      tenantDBManager,
      eventEmitter,
      planSubscriptionModel,
      tenantMetadataModel,
    );
    return { service, calls };
  };

  it('чистит подписку и метаданные ДО удаления тенанта — сирот и FK-блока нет', async () => {
    const { service, calls } = build();
    await service.deleteWorkspace(1, 'org-1');

    expect(calls).toEqual(['subscriptions', 'metadata', 'tenant']);
  });
});
