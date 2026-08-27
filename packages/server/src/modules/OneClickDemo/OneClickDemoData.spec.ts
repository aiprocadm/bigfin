// © 2026 Bigfin
import { SeedOneClickDemoDataService } from './commands/SeedOneClickDemoData.service';
import { CleanupOneClickDemosService } from './commands/CleanupOneClickDemos.service';
import { DEMO_CUSTOMERS, DEMO_ITEMS, DEMO_INVOICES } from './OneClickDemo.data';

/**
 * Д2 карты v18: демо-организация должна быть непустой (иначе смотреть
 * нечего) и не должна жить вечно (каждое демо — отдельная база данных).
 */
const buildSeedService = ({
  incomeAccount = { id: 11 },
  costAccount = { id: 22 },
}: any = {}) => {
  const createCustomer = jest
    .fn()
    .mockImplementation(async (dto) => ({ id: 100 + dto.displayName.length }));
  const createItem = jest.fn().mockResolvedValue(7);
  const createInvoice = jest.fn().mockResolvedValue({ id: 1 });

  const accountModel = () => ({
    query: () => ({
      findOne: async ({ slug }: any) =>
        slug === 'sales-of-product-income' ? incomeAccount : costAccount,
    }),
  });

  // Оплаты и расходы демо проверяются отдельно (OneClickDemoMoney.spec) —
  // здесь достаточно, чтобы они никому не мешали.
  const createPayment = jest.fn().mockResolvedValue({ id: 1 });
  const createExpense = jest.fn().mockResolvedValue({ id: 1 });

  const service = new SeedOneClickDemoDataService(
    { createCustomer } as any,
    { createItem } as any,
    { createSaleInvoice: createInvoice } as any,
    { createPaymentReceived: createPayment } as any,
    { newExpense: createExpense } as any,
    accountModel as any,
  );
  return { service, createCustomer, createItem, createInvoice };
};

describe('наполнение демо-организации', () => {
  it('создаёт покупателей, позиции и счета', async () => {
    const { service, createCustomer, createItem, createInvoice } =
      buildSeedService();

    await service.seedDemoData('RUB');

    expect(createCustomer).toHaveBeenCalledTimes(DEMO_CUSTOMERS.length);
    expect(createItem).toHaveBeenCalledTimes(DEMO_ITEMS.length);
    expect(createInvoice).toHaveBeenCalledTimes(DEMO_INVOICES.length);
  });

  it('покупатели создаются в валюте организации', async () => {
    const { service, createCustomer } = buildSeedService();

    await service.seedDemoData('RUB');

    for (const [dto] of createCustomer.mock.calls) {
      expect(dto.currencyCode).toBe('RUB');
    }
  });

  it('без счёта доходов позиции и счета не создаются, но и не падают', async () => {
    // План счетов приходит при сборке организации; если нужного счёта нет,
    // демо остаётся без товаров — это лучше, чем упавшая постройка.
    const { service, createItem, createInvoice, createCustomer } =
      // именно null: `undefined` подставил бы значение по умолчанию и
      // проверка «счёта доходов нет» ничего бы не проверяла
      buildSeedService({ incomeAccount: null });

    await expect(service.seedDemoData('RUB')).resolves.toBeUndefined();
    expect(createCustomer).toHaveBeenCalledTimes(DEMO_CUSTOMERS.length);
    expect(createItem).not.toHaveBeenCalled();
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it('среди счетов есть просроченный — чтобы список показывал оба состояния', async () => {
    const { service, createInvoice } = buildSeedService();

    await service.seedDemoData('RUB');

    const today = new Date().toISOString().slice(0, 10);
    const overdue = createInvoice.mock.calls.filter(
      ([dto]) => dto.dueDate < today,
    );
    const upcoming = createInvoice.mock.calls.filter(
      ([dto]) => dto.dueDate >= today,
    );

    expect(overdue.length).toBeGreaterThan(0);
    expect(upcoming.length).toBeGreaterThan(0);
  });

  it('данные демо — на русском языке', () => {
    // Демо смотрит российский предприниматель: английские «Acme Inc.»
    // в списках выглядят как чужой продукт.
    const cyrillic = /[А-Яа-яЁё]/;

    expect(DEMO_CUSTOMERS.every((c) => cyrillic.test(c.displayName))).toBe(true);
    expect(DEMO_ITEMS.every((i) => cyrillic.test(i.name))).toBe(true);
  });
});

const buildCleanupService = ({ demos, ttlHours = 24 }: any) => {
  const dropped: string[] = [];
  const deletedDemoIds: number[] = [];
  const deletedUserIds: number[] = [];
  const deletedTenantIds: number[] = [];

  const service = new CleanupOneClickDemosService(
    {
      get: (key: string) =>
        key === 'oneClickDemo.ttlHours'
          ? ttlHours
          : key === 'tenantDatabase.dbNamePrefix'
            ? 'bigfin_tenant_'
            : undefined,
    } as any,
    {
      raw: async (sql: string) => {
        dropped.push(sql);
      },
    } as any,
    {
      query: () => ({
        where: async () => demos,
        deleteById: async (id: number) => {
          deletedDemoIds.push(id);
        },
      }),
    } as any,
    {
      query: () => ({
        findById: async (id: number) => ({ id, organizationId: `org-${id}` }),
        deleteById: async (id: number) => {
          deletedTenantIds.push(id);
        },
      }),
    } as any,
    { query: () => ({ delete: () => ({ where: async () => 1 }) }) } as any,
    {
      query: () => ({
        deleteById: async (id: number) => {
          deletedUserIds.push(id);
        },
      }),
    } as any,
    { query: () => ({ delete: () => ({ where: async () => 1 }) }) } as any,
  );

  return { service, dropped, deletedDemoIds, deletedUserIds, deletedTenantIds };
};

describe('уборка старых демо-организаций', () => {
  it('удаляет базу, запись демо, организацию и её пользователя', async () => {
    const { service, dropped, deletedDemoIds, deletedUserIds, deletedTenantIds } =
      buildCleanupService({
        demos: [{ id: 1, tenantId: 5, userId: 9 }],
      });

    await expect(service.cleanupExpiredDemos()).resolves.toBe(1);

    expect(dropped[0]).toContain('DROP DATABASE IF EXISTS bigfin_tenant_org5');
    expect(deletedDemoIds).toEqual([1]);
    expect(deletedTenantIds).toEqual([5]);
    expect(deletedUserIds).toEqual([9]);
  });

  it('нечего убирать — ничего и не трогает', async () => {
    const { service, dropped } = buildCleanupService({ demos: [] });

    await expect(service.cleanupExpiredDemos()).resolves.toBe(0);
    expect(dropped).toEqual([]);
  });

  it('одно застрявшее демо не останавливает уборку остальных', async () => {
    const { service } = buildCleanupService({
      demos: [
        { id: 1, tenantId: 5, userId: 9 },
        // У этой записи нет пользователя — на ней падает удаление.
        { id: 2, tenantId: null as any, userId: undefined as any },
        { id: 3, tenantId: 7, userId: 11 },
      ],
    });

    // Две уборки из трёх должны состояться.
    await expect(service.cleanupExpiredDemos()).resolves.toBeGreaterThanOrEqual(2);
  });
});
