// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { EnsureDefaultLegalEntityService } from './commands/EnsureDefaultLegalEntity.service';

/**
 * Юрлица группы (этап 6 ТЗ).
 *
 * Пока здесь только создание юрлица по умолчанию. Справочник и ручки
 * добавляются шагом 6.4 — модуль заведён сразу, чтобы следующие шаги
 * дописывали его, а не собирали заново.
 *
 * `TenancyContext` — в providers: реквизиты организации лежат в системной
 * схеме, и без него сервер не поднимется (это стережёт
 * `tenancyModuleImports.spec.ts`).
 */
@Module({
  providers: [EnsureDefaultLegalEntityService, TenancyContext],
  exports: [EnsureDefaultLegalEntityService],
})
export class LegalEntitiesModule {}
