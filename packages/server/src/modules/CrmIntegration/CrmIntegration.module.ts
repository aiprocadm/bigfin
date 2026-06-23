// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { CustomersModule } from '@/modules/Customers/Customers.module';
import { DealsModule } from '@/modules/Deals/Deals.module';
import { CrmIntegrationController } from './CrmIntegration.controller';
import { CrmIntegrationApplication } from './CrmIntegration.application';
import { CrmSettingsService } from './CrmSettings.service';
import { CrmConnectorRegistry } from './CrmConnectorRegistry';
import { CrmSyncService } from './commands/CrmSync.service';
import { CrmSyncLinkService } from './commands/CrmSyncLink.service';
import { Bitrix24ApiService } from './connectors/bitrix24/Bitrix24Api.service';
import { Bitrix24Connector } from './connectors/bitrix24/Bitrix24Connector';

/**
 * ⑯a CRM-интеграция: абстракция `CrmConnector` + коннектор Битрикс24.
 * Односторонняя синхронизация CRM → Bigfin за флагом `crm_integration`.
 */
@Module({
  imports: [
    TenancyDatabaseModule,
    TenancyModule,
    FeaturesModule,
    CustomersModule,
    DealsModule,
  ],
  controllers: [CrmIntegrationController],
  providers: [
    CrmIntegrationApplication,
    CrmSettingsService,
    CrmConnectorRegistry,
    CrmSyncService,
    CrmSyncLinkService,
    Bitrix24ApiService,
    Bitrix24Connector,
  ],
})
export class CrmIntegrationModule {}
