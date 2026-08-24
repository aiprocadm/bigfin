import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrganizationBuildQueue } from '../Organization/Organization.types';
import { AuthModule } from '../Auth/Auth.module';
import { OneClickDemoController } from './OneClickDemo.controller';
import { CreateOneClickDemoService } from './commands/CreateOneClickDemo.service';
import { OneClickDemoSigninService } from './commands/OneClickDemoSignin.service';
import { GetOneClickDemoBuildJobService } from './queries/GetOneClickDemoBuildJob.service';
import { SeedOneClickDemoDataService } from './commands/SeedOneClickDemoData.service';
import { SeedDemoDataOnBuiltSubscriber } from './subscribers/SeedDemoDataOnBuilt.subscriber';
import { CleanupOneClickDemosService } from './commands/CleanupOneClickDemos.service';
import { CleanupOneClickDemosJob } from './jobs/CleanupOneClickDemos.job';
import { CustomersModule } from '../Customers/Customers.module';
import { ItemsModule } from '../Items/Items.module';
import { SaleInvoicesModule } from '../SaleInvoices/SaleInvoices.module';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { AccountsModule } from '../Accounts/Accounts.module';

/**
 * Демо-режим «в один щелчок» (Д1 карты v18, решение 21).
 * Очередь постройки — та же, что у обычной организации: демо строится тем
 * же джобом, никакого второго пути постройки не появляется.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: OrganizationBuildQueue }),
    AuthModule,
    // Демо наполняется обычными службами, а не вставкой в базу: те же
    // проверки и те же проводки, что у настоящей работы (Д2 карты v18).
    CustomersModule,
    ItemsModule,
    SaleInvoicesModule,
    TenancyModule,
    // Модель счёта учёта: демо-товарам нужен счёт доходов из плана счетов.
    AccountsModule,
  ],
  providers: [
    CreateOneClickDemoService,
    OneClickDemoSigninService,
    GetOneClickDemoBuildJobService,
    SeedOneClickDemoDataService,
    SeedDemoDataOnBuiltSubscriber,
    CleanupOneClickDemosService,
    CleanupOneClickDemosJob,
  ],
  controllers: [OneClickDemoController],
})
export class OneClickDemoModule {}
