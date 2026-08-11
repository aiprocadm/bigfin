// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { MarketplacesController } from './Marketplaces.controller';
import { MarketplacesApplication } from './Marketplaces.application';
import { MarketplacesSettingsService } from './MarketplacesSettings.service';
import { WildberriesApiService } from './connectors/wildberries/WildberriesApi.service';
import { WildberriesConnector } from './connectors/wildberries/WildberriesConnector';
import { OzonApiService } from './connectors/ozon/OzonApi.service';
import { OzonConnector } from './connectors/ozon/OzonConnector';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { RolesModule } from '../Roles/Roles.module';

/**
 * ⑱ Маркетплейсы (Wildberries / Ozon). MVP — Wildberries + read-only финансовая
 * сводка за период. За флагом `marketplaces`. Версионируется как CRM (§4.11):
 * Ozon — второй коннектор на ту же абстракцию `MarketplaceConnector`.
 */
@Module({
  imports: [
    // Ради стражей прав на контроллере.
    RolesModule,FeaturesModule],
  controllers: [MarketplacesController],
  providers: [
    MarketplacesApplication,
    MarketplacesSettingsService,
    WildberriesApiService,
    WildberriesConnector,
    OzonApiService,
    OzonConnector,
  ],
})
export class MarketplacesModule {}
