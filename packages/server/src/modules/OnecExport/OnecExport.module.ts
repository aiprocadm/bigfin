// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { OnecExportController } from './OnecExport.controller';
import { GetOnecExportService } from './GetOnecExport.service';
import { FeaturesModule } from '@/modules/Features/Features.module';

/**
 * ⑩ Выгрузка в 1С: денежные операции Bigfin → формат 1CClientBankExchange для
 * загрузки в 1С-бухгалтерию. За флагом `onec_export`. Модели (BankTransaction/
 * Account/Contact) — глобальные tenant-провайдеры.
 */
@Module({
  imports: [FeaturesModule],
  controllers: [OnecExportController],
  providers: [GetOnecExportService],
})
export class OnecExportModule {}
