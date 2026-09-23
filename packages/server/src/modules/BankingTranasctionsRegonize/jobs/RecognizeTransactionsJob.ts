import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Scope } from '@nestjs/common';
import { ClsService, UseCls } from 'nestjs-cls';
import { RecognizeTranasctionsService } from '../commands/RecognizeTranasctions.service';
import { RevertRecognizedTransactionsService } from '../commands/RevertRecognizedTransactions.service';
import {
  RecognizeUncategorizedTransactionsJobPayload,
  RecognizeUncategorizedTransactionsQueue,
} from '../_types';

@Processor({
  name: RecognizeUncategorizedTransactionsQueue,
  scope: Scope.REQUEST,
})
export class RegonizeTransactionsPrcessor extends WorkerHost {
  /**
   * @param {RecognizeTranasctionsService} recognizeTranasctionsService -
   * @param {RevertRecognizedTransactionsService} revertRecognizedTransactionsService -
   * @param {ClsService} clsService -
   */
  constructor(
    private readonly recognizeTranasctionsService: RecognizeTranasctionsService,
    private readonly revertRecognizedTransactionsService: RevertRecognizedTransactionsService,
    private readonly clsService: ClsService,
  ) {
    super();
  }

  /**
   * Triggers sending invoice mail.
   */
  @UseCls()
  async process(job: Job<RecognizeUncategorizedTransactionsJobPayload>) {
    const { ruleId, transactionsCriteria, shouldRevert, apply } = job.data;

    this.clsService.set('organizationId', job.data.organizationId);
    this.clsService.set('userId', job.data.userId);

    try {
      // If shouldRevert is true, first revert recognized transactions before re-recognizing.
      // This is used when a bank rule is edited to ensure transactions previously recognized
      // by lower-priority rules are re-evaluated against the updated rule.
      if (shouldRevert) {
        await this.revertRecognizedTransactionsService.revertRecognizedTransactions(
          ruleId,
          transactionsCriteria,
        );
      }
      const result = await this.recognizeTranasctionsService.recognizeTransactions(
        ruleId,
        transactionsCriteria,
        undefined,
        { apply },
      );
      return result;
    } catch (error) {
      // Раньше ошибка тонула в console.log, и задача считалась успешной.
      // Теперь она падает честно — очередь видит сбой и хранит причину.
      console.error('[bank-rules] распознавание не удалось', error);
      throw error;
    }
  }
}
