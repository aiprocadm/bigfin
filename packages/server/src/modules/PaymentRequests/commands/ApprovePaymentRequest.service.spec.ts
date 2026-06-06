// © 2026 Bigfin
import { ApprovePaymentRequestService } from './ApprovePaymentRequest.service';

describe('ApprovePaymentRequestService', () => {
  it('вставляет плановый отток (source=payment_request) и помечает заявку approved', async () => {
    const requestRow = {
      id: 1,
      status: 'pending',
      amount: 120000,
      currencyCode: 'RUB',
      dueDate: '2026-06-15',
      articleId: 3,
      accountId: 12,
      branchId: null,
      contactId: 7,
      description: 'Аренда',
    };
    const patch = jest.fn().mockResolvedValue(undefined);
    // findById возвращает thenable (для чтения/возврата) с методом .patch.
    const findByIdResult: any = {
      patch,
      then: (resolve: any, reject: any) =>
        Promise.resolve(requestRow).then(resolve, reject),
    };
    const requestModel = () => ({ query: () => ({ findById: () => findByIdResult }) });

    const insert = jest.fn().mockResolvedValue({ id: 99 });
    const operationModel = () => ({ query: () => ({ insert }) });

    const uow = { withTransaction: async (work: any) => work({}) };
    const tenancyContext = { getSystemUser: async () => ({ id: 7 }) };

    const service = new ApprovePaymentRequestService(
      uow as any,
      tenancyContext as any,
      requestModel as any,
      operationModel as any,
    );

    await service.approve(1);

    // Вставлен плановый отток из полей заявки.
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'outflow',
        amount: 120000,
        sourceType: 'payment_request',
        sourceId: 1,
        status: 'confirmed',
      }),
    );
    // Заявка помечена approved + связана с операцией.
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        approvedBy: 7,
        plannedOperationId: 99,
      }),
    );
  });

  it('бросает на недопустимом статусе (нельзя одобрить отклонённую)', async () => {
    const findByIdResult: any = {
      patch: jest.fn(),
      then: (resolve: any) => Promise.resolve({ id: 1, status: 'rejected' }).then(resolve),
    };
    const requestModel = () => ({ query: () => ({ findById: () => findByIdResult }) });
    const operationModel = () => ({ query: () => ({ insert: jest.fn() }) });
    const uow = { withTransaction: async (work: any) => work({}) };
    const tenancyContext = { getSystemUser: async () => ({ id: 7 }) };

    const service = new ApprovePaymentRequestService(
      uow as any,
      tenancyContext as any,
      requestModel as any,
      operationModel as any,
    );

    await expect(service.approve(1)).rejects.toMatchObject({
      errorType: 'INVALID_STATUS_TRANSITION',
    });
  });
});
