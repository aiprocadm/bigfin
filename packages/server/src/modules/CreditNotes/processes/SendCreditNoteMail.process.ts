import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Scope } from '@nestjs/common';
import { SendCreditNoteMailQueue } from '../constants';
import { CreditNoteMailNotification } from '../commands/CreditNoteMailNotification';
import { ClsService, UseCls } from 'nestjs-cls';
import { NotifyMailFailedService } from '@/modules/Notifications/commands/NotifyMailFailed.service';

@Processor({
  name: SendCreditNoteMailQueue,
  scope: Scope.REQUEST,
})
export class SendCreditNoteMailProcess extends WorkerHost {
  constructor(
    private readonly creditNoteMailNotification: CreditNoteMailNotification,
    private readonly clsService: ClsService,
    private readonly notifyMailFailed: NotifyMailFailedService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job) {
    const { messageOpts, creditNoteId, organizationId, userId } = job.data;

    this.clsService.set('organizationId', organizationId);
    this.clsService.set('userId', userId);

    try {
      await this.creditNoteMailNotification.sendMail(creditNoteId, messageOpts);
    } catch (error) {
      console.error('Failed to process credit note mail job:', error);
      // Последняя попытка — падение обязано попасть в ленту (шаг Ф1),
      // а не остаться в консоли сервера, которую никто не читает.
      await this.notifyMailFailed.notifyIfFinal(job, {
        documentType: 'CreditNote',
        documentId: creditNoteId,
        reason: (error as Error)?.message ?? String(error),
      });
      throw error;
    }
  }
}
