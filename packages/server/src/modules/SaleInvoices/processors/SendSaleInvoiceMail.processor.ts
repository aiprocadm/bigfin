import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SendSaleInvoiceMailJob, SendSaleInvoiceQueue } from '../constants';
import { SendSaleInvoiceMail } from '../commands/SendSaleInvoiceMail';
import { Scope } from '@nestjs/common';
import { ClsService, UseCls } from 'nestjs-cls';
import { SendSaleInvoiceMailJobPayload } from '../SaleInvoice.types';
import { NotifyMailFailedService } from '@/modules/Notifications/commands/NotifyMailFailed.service';

@Processor({
  name: SendSaleInvoiceQueue,
  scope: Scope.REQUEST,
})
export class SendSaleInvoiceMailProcessor extends WorkerHost {
  constructor(
    private readonly sendSaleInvoiceMail: SendSaleInvoiceMail,
    private readonly clsService: ClsService,
    private readonly notifyMailFailed: NotifyMailFailedService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<SendSaleInvoiceMailJobPayload>) {
    const { messageOptions, saleInvoiceId, organizationId, userId } =
      job.data;

    this.clsService.set('organizationId', organizationId);
    this.clsService.set('userId', userId);

    try {
      await this.sendSaleInvoiceMail.sendMail(saleInvoiceId, messageOptions);
    } catch (error) {
      console.error('Failed to process invoice mail job:', error);
      // Последняя попытка — падение обязано попасть в ленту (шаг Ф1),
      // а не остаться в консоли сервера, которую никто не читает.
      await this.notifyMailFailed.notifyIfFinal(job, {
        documentType: 'SaleInvoice',
        documentId: saleInvoiceId,
        reason: (error as Error)?.message ?? String(error),
      });
      throw error;
    }
  }
}
