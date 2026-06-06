// © 2026 Bigfin
import { SendDebtReminderService } from './SendDebtReminder.service';

describe('SendDebtReminderService', () => {
  it('ставит письмо-напоминание в очередь через SendSaleInvoiceMail', async () => {
    const triggerMail = jest.fn().mockResolvedValue(undefined);
    const service = new SendDebtReminderService({ triggerMail } as any);

    const res = await service.remind(7);

    expect(triggerMail).toHaveBeenCalledWith(7, { attachInvoice: true });
    expect(res).toEqual({ queued: true });
  });
});
