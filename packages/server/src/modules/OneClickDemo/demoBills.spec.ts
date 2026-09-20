// © 2026 Bigfin
import * as moment from 'moment';
import { SeedOneClickDemoDataService } from './commands/SeedOneClickDemoData.service';
import { DEMO_DATASETS, DemoIndustry } from './data';

/**
 * Будущий кассовый разрыв в демо (FIN-027 ТЗ-2, приёмка 2).
 *
 * Разрыв берётся не из воздуха: его даёт НЕОПЛАЧЕННЫЙ счёт поставщика с
 * ближним сроком. Если счёт заведётся черновиком, в прогноз он не попадёт
 * вовсе — и демо покажет ровную линию, то есть спрячет ровно то, ради чего
 * продукт и нужен.
 *
 * Чистые данные проверены отдельно (`data/demoDatasets.spec.ts`). Здесь
 * проверяется, что наполнение действительно доносит их до продукта.
 */
const ACCOUNTS: Record<string, { id: number }> = {
  'sales-of-product-income': { id: 11 },
  'cost-of-goods-sold': { id: 22 },
  'bank-account': { id: 33 },
  rent: { id: 44 },
  'office-expenses': { id: 55 },
  'bank-fees-and-charges': { id: 66 },
  'other-expenses': { id: 77 },
};

const buildService = ({ vendorsFail = false } = {}) => {
  const createCustomer = jest
    .fn()
    .mockImplementation(async (dto: any) => ({ id: 100 + dto.displayName.length }));
  const createVendor = jest.fn().mockImplementation(async () => {
    if (vendorsFail) throw new Error('поставщик не завёлся');
    return { id: 900 + createVendor.mock.calls.length };
  });
  let itemSeq = 0;
  const createItem = jest.fn().mockImplementation(async () => (itemSeq += 1));
  let invoiceSeq = 0;
  const createInvoice = jest
    .fn()
    .mockImplementation(async () => ({ id: (invoiceSeq += 1) * 10 }));
  const createPayment = jest.fn().mockResolvedValue({ id: 1 });
  const createExpense = jest.fn().mockResolvedValue({ id: 1 });
  const createBill = jest.fn().mockResolvedValue({ id: 2 });

  const accountModel = () => ({
    query: () => ({ findOne: async ({ slug }: any) => ACCOUNTS[slug] }),
  });

  const service = new SeedOneClickDemoDataService(
    { createCustomer } as any,
    { createVendor } as any,
    { createItem } as any,
    { createSaleInvoice: createInvoice } as any,
    { createPaymentReceived: createPayment } as any,
    { newExpense: createExpense } as any,
    { createBill } as any,
    accountModel as any,
  );

  return { service, createCustomer, createVendor, createItem, createBill };
};

const industries: DemoIndustry[] = ['services', 'trade', 'projects'];

describe('наполнение демо отраслевым набором', () => {
  describe.each(industries)('отрасль «%s»', (industry: DemoIndustry) => {
    const dataset = DEMO_DATASETS[industry];

    it('заводит контрагентов и позиции ИМЕННО ЭТОГО набора', async () => {
      const { service, createCustomer, createItem } = buildService();

      await service.seedDemoData('RUB', industry);

      expect(createCustomer).toHaveBeenCalledTimes(dataset.customers.length);
      expect(createCustomer.mock.calls[0][0].displayName).toBe(
        dataset.customers[0].displayName,
      );
      expect(createItem.mock.calls[0][0].name).toBe(dataset.items[0].name);
    });

    it('заводит поставщиков и их счета', async () => {
      const { service, createVendor, createBill } = buildService();

      await service.seedDemoData('RUB', industry);

      expect(createVendor).toHaveBeenCalledTimes(dataset.vendors.length);
      expect(createBill).toHaveBeenCalledTimes(dataset.bills.length);
    });

    it('счёт поставщика ОТКРЫТ, а не черновик', async () => {
      // Черновик не создаёт проводок и в прогноз не попадает: разрыва не
      // будет, а по коду всё «сделано».
      const { service, createBill } = buildService();

      await service.seedDemoData('RUB', industry);

      createBill.mock.calls.forEach(([dto]: any[]) => {
        expect(dto.open).toBe(true);
      });
    });

    it('срок оплаты — В БУДУЩЕМ', async () => {
      const { service, createBill } = buildService();

      await service.seedDemoData('RUB', industry);

      const today = moment().startOf('day');
      createBill.mock.calls.forEach(([dto]: any[]) => {
        expect(moment(dto.dueDate).isAfter(today)).toBe(true);
      });
    });

    it('сумма счёта поставщика равна задуманной', async () => {
      // Позиция берётся из набора, а сумма — из счёта: если перепутать,
      // разрыв окажется другим по глубине или исчезнет вовсе.
      const { service, createBill } = buildService();

      await service.seedDemoData('RUB', industry);

      createBill.mock.calls.forEach(([dto]: any[], index: number) => {
        expect(dto.entries[0].quantity).toBe(1);
        expect(dto.entries[0].rate).toBe(dataset.bills[index].amount);
      });
    });
  });

  it('по умолчанию берётся набор услуг', async () => {
    const { service, createCustomer } = buildService();

    await service.seedDemoData('RUB');

    expect(createCustomer.mock.calls[0][0].displayName).toBe(
      DEMO_DATASETS.services.customers[0].displayName,
    );
  });

  it('чужая отрасль не роняет наполнение', async () => {
    const { service, createCustomer } = buildService();

    await service.seedDemoData('RUB', 'строительство');

    expect(createCustomer).toHaveBeenCalled();
  });

  it('сбой поставщиков НЕ роняет остальное демо', async () => {
    // Демо без счетов поставщиков хуже полного, но несравнимо лучше
    // организации, которая не построилась.
    const { service, createCustomer, createBill } = buildService({
      vendorsFail: true,
    });

    await service.seedDemoData('RUB', 'trade');

    expect(createCustomer).toHaveBeenCalled();
    expect(createBill).not.toHaveBeenCalled();
  });
});
