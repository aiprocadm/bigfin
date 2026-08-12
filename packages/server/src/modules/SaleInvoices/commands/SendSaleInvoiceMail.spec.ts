// © 2026 Bigfin
import { SendSaleInvoiceMail } from './SendSaleInvoiceMail';

/**
 * Письмо по счёту не должно «отправляться» по несуществующему документу.
 *
 * Шаг В2 карты v9: раньше triggerMail сразу ставил задачу в очередь, а счёт
 * загружался только внутри джобы — клиент получал 200 «отправлено», письмо
 * молча не уходило. Через эту же команду шлётся напоминание о долге.
 */
const buildService = ({ found }: { found: boolean }) => {
  const queueAdd = jest.fn().mockResolvedValue(undefined);

  const saleInvoiceModel = () => ({
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

  const service = new SendSaleInvoiceMail(
    {} as any,
    {} as any,
    eventEmitter as any,
    {} as any,
    tenancyContext as any,
    saleInvoiceModel as any,
    { add: queueAdd } as any,
  );

  return { service, queueAdd };
};

describe('письмо по счёту покупателю', () => {
  it('по несуществующему счёту не ставится в очередь', async () => {
    const { service, queueAdd } = buildService({ found: false });

    await expect(service.triggerMail(999999, {} as any)).rejects.toThrow();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('по существующему счёту уходит в очередь', async () => {
    const { service, queueAdd } = buildService({ found: true });

    await service.triggerMail(1, {} as any);
    expect(queueAdd).toHaveBeenCalledTimes(1);
  });
});
