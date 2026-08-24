import { Module } from '@nestjs/common';
import { TransactionsByCustomersExportInjectable } from './TransactionsByCustomersExportInjectable';
import { TransactionsByCustomersPdf } from './TransactionsByCustomersPdf';
import { TransactionsByCustomersRepository } from './TransactionsByCustomersRepository';
import { TransactionsByCustomersSheet } from './TransactionsByCustomersService';
import { TransactionsByCustomersTableInjectable } from './TransactionsByCustomersTableInjectable';
import { TransactionsByCustomersMeta } from './TransactionsByCustomersMeta';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { FinancialSheetCommonModule } from '../../common/FinancialSheetCommon.module';
import { AccountsModule } from '@/modules/Accounts/Accounts.module';
import { TransactionsByCustomerController } from './TransactionsByCustomer.controller';
import { TransactionsByCustomerApplication } from './TransactionsByCustomersApplication';

@Module({
  imports: [FinancialSheetCommonModule, AccountsModule],
  providers: [
    TransactionsByCustomerApplication,
    TransactionsByCustomersRepository,
    TransactionsByCustomersTableInjectable,
    TransactionsByCustomersExportInjectable,
    TransactionsByCustomersSheet,
    TransactionsByCustomersPdf,
    TransactionsByCustomersMeta,
    TenancyContext,
  ],
  controllers: [TransactionsByCustomerController],
  // Наружу для акта сверки взаимных расчётов (К2 карты v19): он берёт
  // обороты из ЭТОГО отчёта, чтобы второго способа считать сальдо в
  // продукте не появилось.
  exports: [TransactionsByCustomersSheet],
})
export class TransactionsByCustomerModule {}
