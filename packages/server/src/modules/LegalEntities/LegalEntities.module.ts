// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { EnsureDefaultLegalEntityService } from './commands/EnsureDefaultLegalEntity.service';
import { BackfillLegalEntityService } from './commands/BackfillLegalEntity.service';
import { BackfillLegalEntityProcessor } from './jobs/BackfillLegalEntityJob';
import { BackfillLegalEntityQueue } from './constants';

/**
 * Юрлица группы (этап 6 ТЗ).
 *
 * Пока здесь юрлицо по умолчанию и фоновое заполнение существующих строк.
 * Справочник и ручки добавляются шагом 6.4 — модуль заведён сразу, чтобы
 * следующие шаги дописывали его, а не собирали заново.
 *
 * `TenancyContext` — в providers: реквизиты организации лежат в системной
 * схеме, и без него сервер не поднимется (это стережёт
 * `tenancyModuleImports.spec.ts`).
 */
@Module({
  imports: [BullModule.registerQueue({ name: BackfillLegalEntityQueue })],
  providers: [
    EnsureDefaultLegalEntityService,
    BackfillLegalEntityService,
    BackfillLegalEntityProcessor,
    TenancyContext,
  ],
  exports: [EnsureDefaultLegalEntityService, BackfillLegalEntityService],
})
export class LegalEntitiesModule {}
