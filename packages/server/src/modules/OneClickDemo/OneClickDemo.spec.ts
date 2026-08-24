// © 2026 Bigfin
import { CreateOneClickDemoService } from './commands/CreateOneClickDemo.service';
import { OneClickDemoSigninService } from './commands/OneClickDemoSignin.service';
import { GetOneClickDemoBuildJobService } from './queries/GetOneClickDemoBuildJob.service';

/**
 * Демо «в один щелчок» (Д1 карты v18, решение 21). Ручки публичные и
 * создают организацию, поэтому проверяем ровно то, что защищает стенд:
 * выключенный флаг закрывает всё, а вход возможен только по ключу демо.
 */
const config = (enable: boolean) => ({
  get: (key: string) => (key === 'oneClickDemo.enable' ? enable : undefined),
});

const buildCreateService = ({ enable }: { enable: boolean }) => {
  const queueAdd = jest.fn().mockResolvedValue({ id: '77' });
  const demoInsert = jest.fn().mockResolvedValue({ id: 1 });

  const tenantRepository = {
    createWithUniqueOrgId: jest
      .fn()
      .mockResolvedValue({ id: 5, organizationId: 'org-5' }),
    saveMetadata: jest.fn().mockResolvedValue(undefined),
  };
  const systemKnex = { transaction: (cb: any) => cb({}) };
  const systemUserModel = {
    query: () => ({ insert: jest.fn().mockResolvedValue({ id: 9 }) }),
  };
  const userTenantModel = {
    query: () => ({ insert: jest.fn().mockResolvedValue({ id: 3 }) }),
  };
  const oneClickDemoModel = { query: () => ({ insert: demoInsert }) };

  const service = new CreateOneClickDemoService(
    config(enable) as any,
    tenantRepository as any,
    systemKnex as any,
    systemUserModel as any,
    userTenantModel as any,
    oneClickDemoModel as any,
    { add: queueAdd } as any,
  );
  return { service, queueAdd, demoInsert, tenantRepository };
};

describe('демо «в один щелчок»: создание', () => {
  it('при выключенном флаге организация НЕ создаётся', async () => {
    const { service, queueAdd, tenantRepository } = buildCreateService({
      enable: false,
    });

    await expect(service.createOneClickDemo()).rejects.toThrow();
    expect(tenantRepository.createWithUniqueOrgId).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('при включённом флаге строит русскую организацию и пишет ключ демо', async () => {
    const { service, queueAdd, demoInsert, tenantRepository } =
      buildCreateService({ enable: true });

    const result = await service.createOneClickDemo();

    // Организация рождается русской: рубль, ru, точки в дате.
    const [, savedMeta] = tenantRepository.saveMetadata.mock.calls[0];
    expect(savedMeta).toMatchObject({
      baseCurrency: 'RUB',
      language: 'ru',
      dateFormat: 'DD.MM.YYYY',
      name: 'Демо-организация',
    });

    expect(queueAdd).toHaveBeenCalledTimes(1);
    expect(demoInsert).toHaveBeenCalledTimes(1);
    // Ключ демо — не короткая угадываемая строка.
    expect(result.demoId.length).toBeGreaterThanOrEqual(32);
    expect(result.buildJob.jobId).toBe('77');
    expect(result.email).toMatch(/^demo-[0-9a-f]+@/);
  });
});

const buildSigninService = ({
  enable,
  demo,
  user = { id: 9, email: 'demo@x' },
  tenant = { id: 5, organizationId: 'org-5' },
}: any) => {
  const service = new OneClickDemoSigninService(
    config(enable) as any,
    {
      signToken: () => 'token-1',
      recordSuccessfulSignin: jest.fn().mockResolvedValue(undefined),
    } as any,
    { query: () => ({ findOne: async () => demo }) } as any,
    { query: () => ({ findById: async () => user }) } as any,
    { query: () => ({ findById: async () => tenant }) } as any,
  );
  return service;
};

describe('демо «в один щелчок»: вход', () => {
  it('по неизвестному ключу вход не даётся', async () => {
    const service = buildSigninService({ enable: true, demo: undefined });

    await expect(service.signin('нет-такого')).rejects.toThrow();
  });

  it('при выключенном флаге вход закрыт даже с настоящим ключом', async () => {
    const service = buildSigninService({
      enable: false,
      demo: { key: 'k', userId: 9, tenantId: 5 },
    });

    await expect(service.signin('k')).rejects.toThrow();
  });

  it('по ключу отдаёт токен в том же виде, что обычный вход', async () => {
    const service = buildSigninService({
      enable: true,
      demo: { key: 'k', userId: 9, tenantId: 5 },
    });

    await expect(service.signin('k')).resolves.toEqual({
      accessToken: 'token-1',
      organizationId: 'org-5',
      tenantId: 5,
      userId: 9,
    });
  });

  it('если организация демо исчезла — «не найдено», а не поломка', async () => {
    const service = buildSigninService({
      enable: true,
      demo: { key: 'k', userId: 9, tenantId: 5 },
      // именно null: `undefined` подставил бы значение по умолчанию и
      // проверка «организация исчезла» ничего бы не проверяла
      tenant: null,
    });

    await expect(service.signin('k')).rejects.toThrow();
  });
});

describe('демо «в один щелчок»: состояние постройки', () => {
  const buildJobService = ({ enable, demo, job }: any) =>
    new GetOneClickDemoBuildJobService(
      config(enable) as any,
      { query: () => ({ findOne: async () => demo }) } as any,
      { getJob: async () => job } as any,
    );

  it('состояние спрашивают по ключу демо, чужой номер джоба не подходит', async () => {
    const service = buildJobService({ enable: true, demo: undefined });

    await expect(service.getBuildJobState('чужое')).rejects.toThrow();
  });

  it('отдаёт готовность, когда джоб завершён', async () => {
    const service = buildJobService({
      enable: true,
      demo: { key: 'k', buildJobId: '77' },
      job: { id: '77', getState: async () => 'completed' },
    });

    await expect(service.getBuildJobState('k')).resolves.toMatchObject({
      id: '77',
      isCompleted: true,
      isRunning: false,
      isFailed: false,
    });
  });
});
