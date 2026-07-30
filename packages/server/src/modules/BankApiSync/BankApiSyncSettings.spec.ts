import { BankApiSyncSettingsService } from './BankApiSyncSettings.service';

/** Заглушка SettingsStore: key-value в памяти. */
function fakeStore(initial: Record<string, any> = {}) {
  const data = { ...initial };
  const store = {
    get: ({ group, key }: any, def: any) => data[`${group}.${key}`] ?? def,
    set: ({ group, key, value }: any) => {
      data[`${group}.${key}`] = value;
    },
    save: jest.fn().mockResolvedValue(undefined),
  };
  return { store, data };
}

const oauth = {
  kind: 'oauth' as const,
  clientId: 'cid',
  clientSecret: 'secret',
  refreshToken: 'rt',
};

describe('BankApiSyncSettingsService', () => {
  it('хранит и отдаёт учётные данные по каждому банку отдельно', async () => {
    const { store } = fakeStore();
    const service = new BankApiSyncSettingsService((() => store) as any);

    await service.setCredentials('tinkoff', { kind: 'token', token: 'T' });
    await service.setCredentials('alfa', oauth);

    expect(await service.getCredentials('tinkoff')).toEqual({
      kind: 'token',
      token: 'T',
    });
    expect(await service.getCredentials('alfa')).toEqual(oauth);
  });

  it('очищает данные только запрошенного банка', async () => {
    const { store } = fakeStore();
    const service = new BankApiSyncSettingsService((() => store) as any);
    await service.setCredentials('tinkoff', { kind: 'token', token: 'T' });
    await service.setCredentials('alfa', oauth);

    await service.clearCredentials('alfa');

    expect(await service.getCredentials('alfa')).toBeNull();
    expect(await service.getCredentials('tinkoff')).not.toBeNull();
  });

  it('читает легаси-ключ tinkoff_token, если нового формата ещё нет', async () => {
    // Тенанты, подключившие Тинькофф до мультипровайдерности, не должны отвалиться.
    const { store } = fakeStore({ 'bank_api_sync.tinkoff_token': 'LEGACY' });
    const service = new BankApiSyncSettingsService((() => store) as any);

    expect(await service.getCredentials('tinkoff')).toEqual({
      kind: 'token',
      token: 'LEGACY',
    });
  });

  it('перечисляет подключённые банки', async () => {
    const { store } = fakeStore();
    const service = new BankApiSyncSettingsService((() => store) as any);
    await service.setCredentials('alfa', oauth);

    expect(await service.listConnected()).toEqual({
      tinkoff: false,
      alfa: true,
    });
  });

  it('битый JSON в настройках не роняет чтение', async () => {
    const { store } = fakeStore({
      'bank_api_sync.alfa_credentials': '{не json',
    });
    const service = new BankApiSyncSettingsService((() => store) as any);

    expect(await service.getCredentials('alfa')).toBeNull();
  });
});
