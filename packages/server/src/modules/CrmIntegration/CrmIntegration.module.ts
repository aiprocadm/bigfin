// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { CustomersModule } from '@/modules/Customers/Customers.module';
import { DealsModule } from '@/modules/Deals/Deals.module';
import { InjectSystemModel } from '@/modules/System/SystemModels/SystemModels.module';
import { CrmIntegrationController } from './CrmIntegration.controller';
import { CrmWebhooksController } from './CrmWebhooks.controller';
import { CrmIntegrationApplication } from './CrmIntegration.application';
import { CrmWebhookToken } from './models/CrmWebhookToken';
import { CrmWebhookTenantService } from './commands/CrmWebhookTenant.service';
import { GenerateCrmWebhookService } from './commands/GenerateCrmWebhook.service';
import { CrmSettingsService } from './CrmSettings.service';
import { CrmConnectorRegistry } from './CrmConnectorRegistry';
import { CrmSyncService } from './commands/CrmSync.service';
import { CrmSyncLinkService } from './commands/CrmSyncLink.service';
import { Bitrix24ApiService } from './connectors/bitrix24/Bitrix24Api.service';
import { Bitrix24Connector } from './connectors/bitrix24/Bitrix24Connector';
import { AmoCrmApiService } from './connectors/amocrm/AmoCrmApi.service';
import { AmoCrmConnector } from './connectors/amocrm/AmoCrmConnector';
import { RolesModule } from '../Roles/Roles.module';

/**
 * CRM-интеграция: абстракция `CrmConnector` + коннекторы Битрикс24 (⑯a) и amoCRM (⑯b).
 * Односторонняя синхронизация CRM → Bigfin за флагом `crm_integration`.
 */
@Module({
  imports: [
    // Ради стражей прав на контроллере.
    RolesModule,
    TenancyDatabaseModule,
    TenancyModule,
    FeaturesModule,
    CustomersModule,
    DealsModule,
  ],
  controllers: [CrmIntegrationController, CrmWebhooksController],
  providers: [
    InjectSystemModel(CrmWebhookToken),
    CrmWebhookTenantService,
    GenerateCrmWebhookService,
    CrmIntegrationApplication,
    CrmSettingsService,
    CrmConnectorRegistry,
    CrmSyncService,
    CrmSyncLinkService,
    Bitrix24ApiService,
    Bitrix24Connector,
    AmoCrmApiService,
    AmoCrmConnector,
  ],
})
export class CrmIntegrationModule {}
