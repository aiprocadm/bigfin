// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { AcquiringController } from './Acquiring.controller';
import { AcquiringApplication } from './Acquiring.application';
import { AcquiringSettingsService } from './AcquiringSettings.service';
import { YookassaApiService } from './connectors/yookassa/YookassaApi.service';
import { FeaturesModule } from '@/modules/Features/Features.module';

/**
 * ⑨d Эквайринг и платёжные системы. MVP — YooKassa + read-only сводка
 * (выручка/комиссия/к зачислению). За флагом `acquiring`. Версионируется как
 * CRM/маркетплейсы (§4.11): другие эквайеры — реализации на ту же абстракцию.
 */
@Module({
  imports: [FeaturesModule],
  controllers: [AcquiringController],
  providers: [AcquiringApplication, AcquiringSettingsService, YookassaApiService],
})
export class AcquiringModule {}
