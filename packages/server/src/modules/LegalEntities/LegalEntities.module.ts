// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { EnsureDefaultLegalEntityService } from './commands/EnsureDefaultLegalEntity.service';
import { BackfillLegalEntityService } from './commands/BackfillLegalEntity.service';
import { BackfillLegalEntityProcessor } from './jobs/BackfillLegalEntityJob';
import { BackfillLegalEntityQueue } from './constants';
import { LegalEntitiesApplication } from './LegalEntities.application';
import { LegalEntitiesController } from './LegalEntities.controller';
import { GetIntercompanyTurnoverService } from './queries/GetIntercompanyTurnover.service';
import { GetLegalEntityAccessService } from './queries/GetLegalEntityAccess.service';

/**
 * Юрлица группы (этап 6 ТЗ).
 *
 * Здесь юрлицо по умолчанию, фоновое заполнение существующих строк и
 * справочник (§6.4). Экран витрины — шагом 6.4б.
 *
 * `TenancyContext` — в providers: реквизиты организации лежат в системной
 * схеме, и без него сервер не поднимется (это стережёт
 * `tenancyModuleImports.spec.ts`).
 */
@Module({
  imports: [BullModule.registerQueue({ name: BackfillLegalEntityQueue })],
  controllers: [LegalEntitiesController],
  providers: [
    LegalEntitiesApplication,
    GetIntercompanyTurnoverService,
    GetLegalEntityAccessService,
    EnsureDefaultLegalEntityService,
    BackfillLegalEntityService,
    BackfillLegalEntityProcessor,
    TenancyContext,
  ],
  exports: [
    LegalEntitiesApplication,
    // Отбор по разрешённым юрлицам нужен отчётам (§8.4). Без экспорта класс
    // объявлен, но недоступен другим модулям — и сервер не стартует вовсе.
    GetLegalEntityAccessService,
    EnsureDefaultLegalEntityService,
    BackfillLegalEntityService,
  ],
})
export class LegalEntitiesModule {}
