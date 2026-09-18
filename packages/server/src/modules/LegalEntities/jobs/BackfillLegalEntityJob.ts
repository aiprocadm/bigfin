// © 2026 Bigfin
import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Scope } from '@nestjs/common';
import { ClsService, UseCls } from 'nestjs-cls';

import { BackfillLegalEntityService } from '../commands/BackfillLegalEntity.service';
import {
  BackfillLegalEntityJobPayload,
  BackfillLegalEntityQueue,
} from '../constants';

/**
 * Фоновое заполнение `legal_entity_id` (этап 6 ТЗ, §6.3 шаг 3).
 *
 * Отдельная задача, а не часть миграции: у живой организации это сотни тысяч
 * строк, и делать их внутри миграции значит держать всех в ожидании, пока
 * она идёт.
 *
 * Задачу можно прервать и запустить заново: заполнение трогает только пустые
 * строки, поэтому повтор продолжает с того места, где остановились.
 */
@Processor({ name: BackfillLegalEntityQueue, scope: Scope.REQUEST })
export class BackfillLegalEntityProcessor extends WorkerHost {
  constructor(
    private readonly backfillService: BackfillLegalEntityService,
    private readonly clsService: ClsService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<BackfillLegalEntityJobPayload>) {
    // Без организации в контексте задача пошла бы в чужую базу: тенантное
    // подключение выбирается именно по нему.
    this.clsService.set('organizationId', job.data.organizationId);
    this.clsService.set('userId', job.data.userId);

    return this.backfillService.backfill();
  }
}
