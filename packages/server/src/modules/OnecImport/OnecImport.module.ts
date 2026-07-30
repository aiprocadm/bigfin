// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { OnecImportController } from './OnecImport.controller';
import { ImportCommerceMlService } from './commands/ImportCommerceMl.service';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { ItemsModule } from '@/modules/Items/Items.module';
import { CustomersModule } from '@/modules/Customers/Customers.module';

/**
 * ⑩ Импорт из 1С: справочники CommerceML 2 (товары, контрагенты) →
 * карточки Bigfin. Идемпотентность — таблица `onec_import_links`.
 * За флагом `onec_import`. Модели — глобальные tenant-провайдеры.
 */
@Module({
  imports: [FeaturesModule, ItemsModule, CustomersModule],
  controllers: [OnecImportController],
  providers: [ImportCommerceMlService],
})
export class OnecImportModule {}
