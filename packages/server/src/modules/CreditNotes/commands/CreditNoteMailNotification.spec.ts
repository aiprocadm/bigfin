// © 2026 Bigfin
import { CreditNoteMailNotification } from './CreditNoteMailNotification';
import { transformCreditNoteToMailDataArgs } from '../utils';

/**
 * Почта кредит-ноты (Р3б карты v18, решение 35). Поведение зеркалит чек:
 * письмо по несуществующему документу не должно уходить в очередь, иначе
 * клиент видит «отправлено», а письма нет.
 */
const buildService = ({ found }: { found: boolean }) => {
  const queueAdd = jest.fn().mockResolvedValue(undefined);

  const creditNoteModel = () => ({
    query: () => ({
      findById: () => ({
        throwIfNotFound: () => {
          if (!found) return Promise.reject(new Error('NotFoundError'));
          return Promise.resolve({ id: 1, customerId: 5 });
        },
      }),
    }),
  });

  const tenancyContext = {
    getTenant: async () => ({ organizationId: 'org' }),
    getSystemUser: async () => ({ id: 7 }),
  };

  const eventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };

  const service = new CreditNoteMailNotification(
    {} as any,
    {} as any,
    {} as any,
    eventEmitter as any,
    {} as any,
    tenancyContext as any,
    {} as any,
    {} as any,
    creditNoteModel as any,
    { add: queueAdd } as any,
  );

  return { service, queueAdd, eventEmitter };
};

describe('письмо по кредит-ноте', () => {
  it('по несуществующей кредит-ноте не ставится в очередь', async () => {
    const { service, queueAdd } = buildService({ found: false });

    await expect(service.triggerMail(999999, {} as any)).rejects.toThrow();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('по существующей кредит-ноте уходит в очередь', async () => {
    const { service, queueAdd } = buildService({ found: true });

    await service.triggerMail(1, {} as any);
    expect(queueAdd).toHaveBeenCalledTimes(1);
  });

  it('в очередь кладётся id кредит-ноты и владелец организации', async () => {
    const { service, queueAdd } = buildService({ found: true });

    await service.triggerMail(42, { attachCreditNote: true } as any);

    const [, payload] = queueAdd.mock.calls[0];
    expect(payload).toMatchObject({
      creditNoteId: 42,
      organizationId: 'org',
      userId: 7,
      messageOpts: { attachCreditNote: true },
    });
  });
});

describe('подстановка в текст письма кредит-ноты', () => {
  it('отдаёт имена переменных, которые видит пользователь в редакторе', () => {
    const args = transformCreditNoteToMailDataArgs({
      customer: { displayName: 'ООО «Ромашка»' },
      creditNoteNumber: 'CN-00007',
      formattedCreditNoteDate: '23.08.2026',
      formattedAmount: '1 000,00 ₽',
    });

    expect(args).toEqual({
      'Customer Name': 'ООО «Ромашка»',
      'Credit Note Number': 'CN-00007',
      'Credit Note Date': '23.08.2026',
      'Credit Note Amount': '1 000,00 ₽',
    });
  });
});
