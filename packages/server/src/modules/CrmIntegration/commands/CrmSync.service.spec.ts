import { CrmSyncService } from './CrmSync.service';
import { CrmConnector } from '../types';

/** In-memory fake-коннектор для проверки оркестрации без реального CRM. */
const fakeConnector = (): CrmConnector => ({
  key: 'fake',
  isConfigured: async () => true,
  fetchContacts: async () => [
    {
      externalId: 'c1',
      displayName: 'ООО Ромашка',
      inn: '7707083893',
      email: null,
      phone: null,
      companyName: 'ООО Ромашка',
    },
    {
      externalId: 'c2',
      displayName: 'Иван Петров',
      inn: null,
      email: 'ivan@example.ru',
      phone: null,
      companyName: null,
    },
  ],
  fetchDeals: async () => [
    {
      externalId: 'd1',
      name: 'Поставка',
      amount: 250000,
      contactExternalId: 'c1',
      closedAt: null,
    },
    {
      externalId: 'd2',
      name: 'Услуга',
      amount: null,
      contactExternalId: null,
      closedAt: null,
    },
  ],
});

const makeService = (overrides: {
  contactMap?: Map<string, number>;
  dealExternalIds?: Set<string>;
  /** Id связанной сделки — по нему проверяем обновление данными из CRM. */
  linkedDealId?: number;
}) => {
  const registry = { get: () => fakeConnector() } as any;
  const links = {
    getContactIdMap: jest.fn(async () => overrides.contactMap ?? new Map()),
    getDealExternalIds: jest.fn(async () => overrides.dealExternalIds ?? new Set()),
    record: jest.fn(async () => undefined),
    // Связанная сделка ищется по внешнему идентификатору, чтобы её обновить.
    getEntityId: jest.fn(async () => overrides.linkedDealId ?? 200),
  } as any;
  let nextCustomerId = 100;
  let nextDealId = 200;
  const createCustomer = {
    createCustomer: jest.fn(async () => ({ id: ++nextCustomerId })),
  } as any;
  const createDeal = {
    create: jest.fn(async () => ({ id: ++nextDealId })),
  } as any;
  // Обновление уже связанных сущностей: правка в CRM должна доезжать.
  const editDeal = { edit: jest.fn(async () => ({})) } as any;
  const editCustomer = { editCustomer: jest.fn(async () => ({})) } as any;
  const tenancyContext = {
    getTenant: async () => ({ metadata: { baseCurrency: 'RUB' } }),
  } as any;

  const service = new CrmSyncService(
    registry,
    links,
    createCustomer,
    createDeal,
    editDeal,
    editCustomer,
    tenancyContext,
  );
  return { service, links, createCustomer, createDeal, editDeal, editCustomer };
};

describe('CrmSyncService', () => {
  it('импортирует контрагентов и сделки, связывая сделку с контрагентом', async () => {
    const { service, createCustomer, createDeal, links } = makeService({});

    const result = await service.sync('fake');

    expect(result).toEqual({
      contactsImported: 2,
      contactsSkipped: 0,
      dealsImported: 2,
      dealsSkipped: 0,
    });
    expect(createCustomer.createCustomer).toHaveBeenCalledTimes(2);
    // Сделка d1 связана с только что созданным контрагентом c1 (id 101).
    expect(createDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Поставка', contactId: 101 }),
    );
    // d2 без контрагента.
    expect(createDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Услуга', contactId: undefined }),
    );
    // 4 связи записаны (2 контакта + 2 сделки).
    expect(links.record).toHaveBeenCalledTimes(4);
  });

  it('идемпотентна: уже связанные сущности пропускаются', async () => {
    const { service, createCustomer, createDeal } = makeService({
      contactMap: new Map([['c1', 101]]),
      dealExternalIds: new Set(['d1']),
    });

    const result = await service.sync('fake');

    expect(result).toEqual({
      contactsImported: 1, // только c2
      contactsSkipped: 1, // c1
      dealsImported: 1, // только d2
      dealsSkipped: 1, // d1
    });
    expect(createCustomer.createCustomer).toHaveBeenCalledTimes(1);
    expect(createDeal.create).toHaveBeenCalledTimes(1);
  });

  it('бросает ошибку, если коннектор не найден', async () => {
    const { service } = makeService({});
    (service as any).registry.get = () => undefined;
    await expect(service.sync('missing')).rejects.toBeDefined();
  });

  describe('importCanonical (входящий webhook ⑯c)', () => {
    it('импортирует одиночные контакт и сделку', async () => {
      const { service, createCustomer, createDeal } = makeService({});
      const res = await service.importCanonical('owncrm', {
        contact: {
          externalId: 'c9',
          displayName: 'ООО Тест',
          inn: null,
          email: null,
          phone: null,
          companyName: null,
        },
        deal: {
          externalId: 'd9',
          name: 'Новая сделка',
          amount: 1000,
          contactExternalId: null,
          closedAt: null,
        },
      });
      expect(res).toEqual({
        contactsImported: 1,
        contactsSkipped: 0,
        dealsImported: 1,
        dealsSkipped: 0,
      });
      expect(createCustomer.createCustomer).toHaveBeenCalledTimes(1);
      expect(createDeal.create).toHaveBeenCalledTimes(1);
    });

    it('идемпотентно: уже связанная сделка пропускается', async () => {
      const { service, createDeal } = makeService({
        dealExternalIds: new Set(['d9']),
      });
      const res = await service.importCanonical('owncrm', {
        deal: {
          externalId: 'd9',
          name: 'Дубль',
          amount: null,
          contactExternalId: null,
          closedAt: null,
        },
      });
      expect(res.dealsImported).toBe(0);
      expect(res.dealsSkipped).toBe(1);
      expect(createDeal.create).not.toHaveBeenCalled();
    });

    it('связанная сделка обновляется данными из CRM, а не игнорируется', async () => {
      const { service, editDeal } = makeService({
        dealExternalIds: new Set(['d9']),
        linkedDealId: 77,
      });

      await service.importCanonical('owncrm', {
        deal: {
          externalId: 'd9',
          name: 'Поставка мебели (уточнено)',
          amount: 460000,
          contactExternalId: null,
          closedAt: null,
        },
      });

      // Поменяли сумму в CRM — это обязано доехать до Bigfin.
      expect(editDeal.edit).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          name: 'Поставка мебели (уточнено)',
          costEstimate: 460000,
        }),
      );
    });

    it('пустые поля из CRM не затирают заполненное в Bigfin', async () => {
      const { service, editDeal } = makeService({
        dealExternalIds: new Set(['d9']),
        linkedDealId: 77,
      });

      await service.importCanonical('owncrm', {
        deal: {
          externalId: 'd9',
          name: 'Только имя',
          amount: null,
          contactExternalId: null,
          closedAt: null,
        },
      });

      const [, patch] = editDeal.edit.mock.calls[0];
      expect(patch).toEqual({ name: 'Только имя' });
    });

    it('связанный контрагент тоже обновляется', async () => {
      const { service, editCustomer } = makeService({
        contactMap: new Map([['c9', 55]]),
      });

      await service.importCanonical('owncrm', {
        contact: {
          externalId: 'c9',
          displayName: 'ИП Сидоров',
          inn: '7707083893',
          email: null,
          phone: null,
          companyName: null,
        },
      });

      expect(editCustomer.editCustomer).toHaveBeenCalledWith(
        55,
        expect.objectContaining({ displayName: 'ИП Сидоров', inn: '7707083893' }),
      );
    });
  });
});
