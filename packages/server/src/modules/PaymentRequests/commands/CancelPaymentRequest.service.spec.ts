// © 2026 Bigfin
import { ForbiddenException } from '@nestjs/common';
import { CancelPaymentRequestService } from './CancelPaymentRequest.service';

/**
 * Отменить заявку на оплату может её автор — или тот, кто и одобряет.
 *
 * Заявку подаёт любой участник: в этом смысл модуля, сотрудник просит оплатить
 * счёт, а решение принимает администратор. Поэтому создание правом не
 * закрывается. А вот отмена до этой правки была открыта совсем: любой участник
 * отменял ЧУЖУЮ заявку, и автор об этом не узнавал.
 *
 * Правом такое не описать — дело не в том, что человеку доверено, а в том, чья
 * это заявка. Поэтому проверка живёт в самой службе.
 */
const buildService = ({
  createdBy,
  userId,
  canManageAll = false,
}: {
  createdBy: number;
  userId: number;
  canManageAll?: boolean;
}) => {
  const patched: any[] = [];

  const requestModel = () => ({
    query: (_trx?: any) => ({
      findById: (_id: number) => ({
        // Чтение заявки до проверки и правка после неё — один и тот же вызов.
        then: undefined,
        patch: (values: any) => {
          patched.push(values);
          return Promise.resolve(1);
        },
        status: 'pending',
        createdBy,
      }),
    }),
  });

  const operationModel = () => ({
    query: () => ({ findById: () => ({ patch: () => Promise.resolve(1) }) }),
  });

  const uow = {
    withTransaction: async (fn: any) => fn({}),
  };

  const tenancyContext = {
    getSystemUser: async () => ({ id: userId }),
  };

  const service = new CancelPaymentRequestService(
    uow as any,
    requestModel as any,
    operationModel as any,
    tenancyContext as any,
  );

  return { service, patched, canManageAll };
};

describe('отмена заявки на оплату', () => {
  it('автор отменяет свою заявку', async () => {
    const { service } = buildService({ createdBy: 7, userId: 7 });

    await expect(service.cancel(1, false)).resolves.toBeDefined();
  });

  it('чужую заявку обычный участник не отменяет', async () => {
    const { service } = buildService({ createdBy: 7, userId: 9 });

    await expect(service.cancel(1, false)).rejects.toThrow(ForbiddenException);
  });

  it('тот, кто одобряет заявки, может отменить любую', async () => {
    const { service } = buildService({ createdBy: 7, userId: 9 });

    await expect(service.cancel(1, true)).resolves.toBeDefined();
  });
});
