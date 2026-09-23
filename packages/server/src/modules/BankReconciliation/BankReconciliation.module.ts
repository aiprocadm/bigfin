// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { BankApiSyncModule } from '../BankApiSync/BankApiSync.module';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { RolesModule } from '../Roles/Roles.module';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { BankHousekeepingCron } from './BankHousekeeping.cron';
import { BankReconciliationController } from './BankReconciliation.controller';
import { BankReconciliationProcessor } from './BankReconciliation.processor';
import { BankReconciliationService, RECONCILIATION_QUEUE } from './BankReconciliation.service';
import { Reconciliation } from './models/Reconciliation';
import { ReconciliationItem } from './models/ReconciliationItem';

const models = [RegisterTenancyModel(Reconciliation), RegisterTenancyModel(ReconciliationItem)];

/**
 * Сверка с банком и ежедневная уборка банковских данных (FT-040…FT-042
 * ТЗ-3).
 */
@Module({
  imports: [
    RolesModule,
    BankApiSyncModule,
    BankingCategorizeModule,
    BankingTransactionsModule,
    BullModule.registerQueue({ name: RECONCILIATION_QUEUE }),
    ...models,
  ],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService, BankReconciliationProcessor, BankHousekeepingCron],
})
export class BankReconciliationModule {}
