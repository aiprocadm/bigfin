// © 2026 Bigfin
import { GetFailedMailsService } from './GetFailedMails.service';

/**
 * Шаг Ф4 карты v10: «не отправленные письма» видны владельцу счётчиком.
 *
 * Записи в ленте (Ф1) видны по одной; здесь — сводка за неделю: 22 упавшие
 * задачи на стенде до этого находились только прямым запросом в Redis.
 */
const buildService = (rows: any[]) => {
  const calls: Record<string, any[]> = { where: [], orderBy: [], limit: [] };

  const notificationModel = () => ({
    query: () => ({
      onBuild: async (cb: (qb: any) => void) => {
        const qb = {
          where: (...args: any[]) => calls.where.push(args),
          orderBy: (...args: any[]) => calls.orderBy.push(args),
          limit: (...args: any[]) => calls.limit.push(args),
        };
        cb(qb);
        return rows;
      },
    }),
  });

  const service = new GetFailedMailsService(notificationModel as any);

  return { service, calls };
};

describe('не отправленные письма за неделю', () => {
  it('берутся только mail_failed за последние 7 дней, свежие первыми', async () => {
    const { service, calls } = buildService([]);

    await service.getFailedMails();

    expect(calls.where[0][0]).toBe('eventType');
    expect(calls.where[0][2]).toBe('mail_failed');
    // Срок: строгое «за 7 дней», а не «за всё время».
    expect(calls.where[1][0]).toBe('firedAt');
    expect(calls.where[1][1]).toBe('>=');
    expect(calls.orderBy).toEqual([['firedAt', 'desc']]);
  });

  it('раскрывает детали из полезной нагрузки записи', async () => {
    const { service } = buildService([
      {
        firedAt: '2026-08-13 10:00:00',
        payload: JSON.stringify({
          documentType: 'SaleInvoice',
          documentId: 8,
          reason: 'SMTP timeout',
        }),
      },
      // Битая нагрузка не должна ронять сводку.
      { firedAt: '2026-08-12 10:00:00', payload: '{оборванный' },
    ]);

    const result = await service.getFailedMails();

    expect(result.count).toBe(2);
    expect(result.items[0]).toMatchObject({
      firedAt: '2026-08-13 10:00:00',
      documentType: 'SaleInvoice',
      documentId: 8,
      reason: 'SMTP timeout',
    });
    expect(result.items[1].reason).toBe('');
  });
});
