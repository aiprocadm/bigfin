// © 2026 Bigfin
import { NotifyMailFailedService } from './NotifyMailFailed.service';

/**
 * Шаг Ф1 карты v10: окончательное падение письма попадает в ленту уведомлений.
 *
 * Повторы (Ф2) спасают от временных сбоев, но когда исчерпаны и они, человек
 * обязан узнать об этом из продукта, а не от контрагента через неделю.
 */
const buildService = () => {
  const inserted: any[] = [];
  let existing: any = null;

  const notificationModel = () => ({
    query: () => ({
      findOne: async () => existing,
      insert: async (row: any) => {
        inserted.push(row);
        return row;
      },
    }),
  });

  const service = new NotifyMailFailedService(notificationModel as any);

  return {
    service,
    inserted,
    setExisting: (value: any) => {
      existing = value;
    },
  };
};

const jobOf = (attemptsMade: number, attempts = 5) =>
  ({
    id: '14',
    attemptsMade,
    opts: { attempts },
    queueName: 'SendSaleInvoiceQueue',
  }) as any;

describe('уведомление о невыходе письма', () => {
  it('не последняя попытка — ленту не трогаем, впереди повтор', async () => {
    const { service, inserted } = buildService();

    await service.notifyIfFinal(jobOf(1), {
      documentType: 'SaleInvoice',
      documentId: 8,
      reason: 'SMTP connect timeout',
    });

    expect(inserted).toEqual([]);
  });

  it('последняя попытка — запись в ленте с причиной', async () => {
    const { service, inserted } = buildService();

    // При пятой (последней) попытке завершённых до неё — четыре.
    await service.notifyIfFinal(jobOf(4), {
      documentType: 'SaleInvoice',
      documentId: 8,
      reason: 'SMTP connect timeout',
    });

    expect(inserted).toHaveLength(1);
    expect(inserted[0].eventType).toBe('mail_failed');
    expect(inserted[0].dedupKey).toBe('mail_failed:SendSaleInvoiceQueue:14');
    expect(JSON.parse(inserted[0].payload)).toMatchObject({
      documentType: 'SaleInvoice',
      documentId: 8,
      reason: 'SMTP connect timeout',
    });
  });

  it('повторный вызов по той же задаче не дублирует запись', async () => {
    const { service, inserted, setExisting } = buildService();
    setExisting({ id: 1 });

    await service.notifyIfFinal(jobOf(4), {
      documentType: 'SaleInvoice',
      documentId: 8,
      reason: 'SMTP connect timeout',
    });

    expect(inserted).toEqual([]);
  });

  it('сбой самой записи в ленту не роняет обработку задачи', async () => {
    const notificationModel = () => ({
      query: () => {
        throw new Error('база недоступна');
      },
    });
    const service = new NotifyMailFailedService(notificationModel as any);

    // Ошибка уведомления не должна маскировать настоящую ошибку письма.
    await expect(
      service.notifyIfFinal(jobOf(4), {
        documentType: 'SaleInvoice',
        documentId: 8,
        reason: 'x',
      }),
    ).resolves.toBeUndefined();
  });
});
