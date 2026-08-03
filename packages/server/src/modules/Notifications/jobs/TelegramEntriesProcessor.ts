// © 2026 Bigfin
import { Scope } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClsService, UseCls } from 'nestjs-cls';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { TELEGRAM_ENTRIES_QUEUE, TELEGRAM_ENTRIES_JOB } from '../constants';
import { PullTelegramEntriesService } from '../commands/PullTelegramEntries.service';

/**
 * ㉓ Разбор входящих сообщений Telegram по одному тенанту.
 * Тенантный контекст выставляется здесь: у крона его нет.
 */
@Processor({ name: TELEGRAM_ENTRIES_QUEUE, scope: Scope.REQUEST })
export class TelegramEntriesProcessor extends WorkerHost {
  constructor(
    private readonly cls: ClsService,
    private readonly featuresManager: FeaturesManager,
    private readonly pullEntries: PullTelegramEntriesService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<{ organizationId: string }>): Promise<any> {
    if (job.name !== TELEGRAM_ENTRIES_JOB) return { skipped: 'other_job' };

    this.cls.set('organizationId', job.data.organizationId);

    const enabled = await this.featuresManager.accessible(
      Features.TELEGRAM_QUICK_ENTRY,
    );
    if (!enabled) return { skipped: 'feature_off' };

    return this.pullEntries.pull();
  }
}
