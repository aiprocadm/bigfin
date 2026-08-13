// © 2026 Bigfin
import { SendSaleEstimateMail } from './SendSaleEstimateMail';

/**
 * Письмо по смете не должно «отправляться» по несуществующему документу
 * (шаг В2 карты v9: очередь ставилась до какой-либо загрузки сметы).
 */
const buildService = ({ found }: { found: boolean }) => {
  const queueAdd = jest.fn().mockResolvedValue(undefined);

  const saleEstimateModel = () => ({
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

  const eventPublisher = { emitAsync: jest.fn().mockResolvedValue(undefined) };

  const service = new SendSaleEstimateMail(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    eventPublisher as any,
    {} as any,
    tenancyContext as any,
    {} as any,
    saleEstimateModel as any,
    { add: queueAdd } as any,
  );

  return { service, queueAdd };
};

describe('письмо по смете', () => {
  it('по несуществующей смете не ставится в очередь', async () => {
    const { service, queueAdd } = buildService({ found: false });

    await expect(service.triggerMail(999999, {} as any)).rejects.toThrow();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('по существующей смете уходит в очередь', async () => {
    const { service, queueAdd } = buildService({ found: true });

    await service.triggerMail(1, {} as any);
    expect(queueAdd).toHaveBeenCalledTimes(1);
  });
});
