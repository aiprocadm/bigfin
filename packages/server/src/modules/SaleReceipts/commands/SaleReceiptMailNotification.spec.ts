// © 2026 Bigfin
import { SaleReceiptMailNotification } from './SaleReceiptMailNotification';

/**
 * Письмо по чеку не должно «отправляться» по несуществующему документу
 * (шаг В2 карты v9: очередь ставилась до какой-либо загрузки чека).
 */
const buildService = ({ found }: { found: boolean }) => {
  const queueAdd = jest.fn().mockResolvedValue(undefined);

  const saleReceiptModel = () => ({
    query: () => ({
      findById: () => ({
        throwIfNotFound: () => {
          if (!found) return Promise.reject(new Error('NotFoundError'));
          return Promise.resolve({ id: 1 });
        },
      }),
    }),
  });

  const tenancyContext = {
    getTenant: async () => ({ organizationId: 'org' }),
    getSystemUser: async () => ({ id: 7 }),
  };

  const eventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };

  const service = new SaleReceiptMailNotification(
    {} as any,
    {} as any,
    {} as any,
    eventEmitter as any,
    {} as any,
    tenancyContext as any,
    {} as any,
    {} as any,
    saleReceiptModel as any,
    { add: queueAdd } as any,
  );

  return { service, queueAdd };
};

describe('письмо по чеку', () => {
  it('по несуществующему чеку не ставится в очередь', async () => {
    const { service, queueAdd } = buildService({ found: false });

    await expect(service.triggerMail(999999, {} as any)).rejects.toThrow();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('по существующему чеку уходит в очередь', async () => {
    const { service, queueAdd } = buildService({ found: true });

    await service.triggerMail(1, {} as any);
    expect(queueAdd).toHaveBeenCalledTimes(1);
  });
});
