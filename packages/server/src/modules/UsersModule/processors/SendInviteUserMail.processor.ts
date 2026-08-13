import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Scope } from '@nestjs/common';
import { ClsService, UseCls } from 'nestjs-cls';
import {
  SendInviteUserMailJob,
  SendInviteUserMailQueue,
} from '../Users.constants';
import { SendInviteUserMailJobPayload } from '../Users.types';
import { SendInviteUsersMailMessage } from '../commands/SendInviteUsersMailMessage.service';
import { NotifyMailFailedService } from '@/modules/Notifications/commands/NotifyMailFailed.service';

@Processor({
  name: SendInviteUserMailQueue,
  scope: Scope.REQUEST,
})
export class SendInviteUserMailProcessor extends WorkerHost {
  constructor(
    private readonly sendInviteUsersMailService: SendInviteUsersMailMessage,
    private readonly clsService: ClsService,
    private readonly notifyMailFailed: NotifyMailFailedService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<SendInviteUserMailJobPayload>) {
    const { fromUser, invite, organizationId, userId } = job.data;

    this.clsService.set('organizationId', organizationId);
    this.clsService.set('userId', userId);

    try {
      await this.sendInviteUsersMailService.sendInviteMail(fromUser, invite);
    } catch (error) {
      console.error('Failed to process invite user mail job:', error);
      // Последняя попытка — падение обязано попасть в ленту (шаг Ф1),
      // а не остаться в консоли сервера, которую никто не читает.
      await this.notifyMailFailed.notifyIfFinal(job, {
        documentType: 'UserInvite',
        documentId: invite?.id ?? 0,
        reason: (error as Error)?.message ?? String(error),
      });
      throw error;
    }
  }
}
