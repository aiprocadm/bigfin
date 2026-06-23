// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { MarketplacesController } from './Marketplaces.controller';
import { MarketplacesApplication } from './Marketplaces.application';
import { MarketplacesSettingsService } from './MarketplacesSettings.service';
import { WildberriesApiService } from './connectors/wildberries/WildberriesApi.service';
import { WildberriesConnector } from './connectors/wildberries/WildberriesConnector';
import { FeaturesModule } from '@/modules/Features/Features.module';

/**
 * ⑱ Маркетплейсы (Wildberries / Ozon). MVP — Wildberries + read-only финансовая
 * сводка за период. За флагом `marketplaces`. Версионируется как CRM (§4.11):
 * Ozon — второй коннектор на ту же абстракцию `MarketplaceConnector`.
 */
@Module({
  imports: [FeaturesModule],
  controllers: [MarketplacesController],
  providers: [
    MarketplacesApplication,
    MarketplacesSettingsService,
    WildberriesApiService,
    WildberriesConnector,
  ],
})
export class MarketplacesModule {}
