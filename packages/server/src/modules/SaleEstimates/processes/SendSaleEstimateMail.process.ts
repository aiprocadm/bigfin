import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Scope } from '@nestjs/common';
import {
  SendSaleEstimateMailJob,
  SendSaleEstimateMailQueue,
} from '../types/SaleEstimates.types';
import { SendSaleEstimateMail } from '../commands/SendSaleEstimateMail';
import { ClsService, UseCls } from 'nestjs-cls';
import { NotifyMailFailedService } from '@/modules/Notifications/commands/NotifyMailFailed.service';

@Processor({
  name: SendSaleEstimateMailQueue,
  scope: Scope.REQUEST,
})
export class SendSaleEstimateMailProcess extends WorkerHost {
  constructor(
    private readonly sendEstimateMailService: SendSaleEstimateMail,
    private readonly clsService: ClsService,
    private readonly notifyMailFailed: NotifyMailFailedService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job) {
    const { saleEstimateId, messageOptions, organizationId, userId } = job.data;

    this.clsService.set('organizationId', organizationId);
    this.clsService.set('userId', userId);

    try {
      await this.sendEstimateMailService.sendMail(saleEstimateId, messageOptions);
    } catch (error) {
      console.error('Failed to process estimate mail job:', error);
      // Последняя попытка — падение обязано попасть в ленту (шаг Ф1),
      // а не остаться в консоли сервера, которую никто не читает.
      await this.notifyMailFailed.notifyIfFinal(job, {
        documentType: 'SaleEstimate',
        documentId: saleEstimateId,
        reason: (error as Error)?.message ?? String(error),
      });
      throw error;
    }
  }
}
