// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { MoySkladController } from './MoySklad.controller';
import { MoySkladApplication } from './MoySklad.application';
import { MoyskladSettingsService } from './MoyskladSettings.service';
import { MoyskladApiService } from './MoyskladApi.service';
import { FeaturesModule } from '@/modules/Features/Features.module';

/**
 * ㉛ Интеграция МойСклад: pull-превью товаров и продаж (read-only). За флагом
 * `moysklad`. Финансовое отражение в ДДС/ОПиУ по статьям — следующий этап.
 */
@Module({
  imports: [FeaturesModule],
  controllers: [MoySkladController],
  providers: [MoySkladApplication, MoyskladSettingsService, MoyskladApiService],
})
export class MoySkladModule {}
