// © 2026 Bigfin
import { Logger, Scope } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClsService, UseCls } from 'nestjs-cls';

import { TransactionsTrashService } from '@/modules/BankingTransactions/commands/TransactionsTrash.service';
import {
  BANK_HOUSEKEEPING_JOB,
  BankReconciliationService,
  RECONCILIATION_QUEUE,
} from './BankReconciliation.service';

/**
 * Фоновые задачи сверки и уборки (FT-040…FT-042 ТЗ-3):
 * - сверка одного счёта за период;
 * - ежедневная уборка организации: корзина старше 90 дней и история сверок
 *   старше 180 дней.
 */
@Processor({ name: RECONCILIATION_QUEUE, scope: Scope.REQUEST })
export class BankReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(BankReconciliationProcessor.name);

  constructor(
    private readonly cls: ClsService,
    private readonly reconciliation: BankReconciliationService,
    private readonly trash: TransactionsTrashService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<any>) {
    this.cls.set('organizationId', job.data.organizationId);
    if (job.data.userId) this.cls.set('userId', job.data.userId);

    if (job.name === BANK_HOUSEKEEPING_JOB) {
      const trash = await this.trash.purgeExpired();
      const reconciliations = await this.reconciliation.purgeOld();
      return { trash, reconciliations };
    }

    const { reconciliationId, mode } = job.data;
    try {
      const ops =
        mode === 'integration'
          ? await this.reconciliation.fetchIntegrationOps(
              { fromDate: job.data.fromDate, toDate: job.data.toDate, ...(await this.recDates(reconciliationId)) },
              job.data.provider,
              job.data.accountNumber,
            )
          : job.data.ops ?? [];
      await this.reconciliation.run(reconciliationId, ops);
      return { reconciliationId };
    } catch (error) {
      // Сбой сверки записан в самой сверке (status = failed) — очередь тоже
      // видит его, а не «успешно».
      this.logger.error(`Сверка ${reconciliationId} не удалась: ${(error as any)?.message}`);
      throw error;
    }
  }

  private async recDates(reconciliationId: number) {
    const rec: any = await this.reconciliation.get(reconciliationId);
    return { fromDate: rec.fromDate, toDate: rec.toDate };
  }
}
