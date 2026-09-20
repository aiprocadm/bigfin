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
import { PaymentsReceivedModule } from '../PaymentReceived/PaymentsReceived.module';
import { ExpensesModule } from '../Expenses/Expenses.module';
import { VendorsModule } from '../Vendors/Vendors.module';
import { BillsModule } from '../Bills/Bills.module';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { AccountsModule } from '../Accounts/Accounts.module';
import { S3Module } from '../S3/S3.module';

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
    // Деньги в демо: оплаты по счетам и расходы (С3 карты v29).
    PaymentsReceivedModule,
    ExpensesModule,
    // Поставщики и их неоплаченные счета: без них в демо нет будущей
    // выплаты, а значит и кассового разрыва впереди (FIN-027).
    VendorsModule,
    BillsModule,
    TenancyModule,
    // Модель счёта учёта: демо-товарам нужен счёт доходов из плана счетов.
    AccountsModule,
    // Уборка демо удаляет и файлы организации из хранилища (Д4 карты v86).
    S3Module,
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
