// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { SendSaleInvoiceMail } from '@/modules/SaleInvoices/commands/SendSaleInvoiceMail';
import { SendInvoiceMailDTO } from '@/modules/SaleInvoices/SaleInvoice.types';

@Injectable()
export class SendDebtReminderService {
  constructor(private readonly invoiceMail: SendSaleInvoiceMail) {}

  /**
   * Напоминание дебитору: отправляет неоплаченный счёт клиенту на email,
   * переиспользуя рабочую отправку счёта (SendSaleInvoiceMail). Письмо ставится
   * в очередь; получатель/тема/текст подтягиваются из счёта по умолчанию.
   * Своё письмо-напоминание не пишем (решение основателя 2026-06-06).
   */
  public async remind(invoiceId: number): Promise<{ queued: true }> {
    // Все поля SendInvoiceMailDTO опциональны — воркер мёржит с дефолтами счёта.
    const messageOptions = { attachInvoice: true } as SendInvoiceMailDTO;
    await this.invoiceMail.triggerMail(invoiceId, messageOptions);
    return { queued: true };
  }
}
