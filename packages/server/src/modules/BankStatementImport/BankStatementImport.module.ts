// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BankStatementImportController } from './BankStatementImport.controller';
import { Import1CStatementService } from './commands/Import1CStatement.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { FeaturesModule } from '../Features/Features.module';

/**
 * Модуль импорта банковских выписок в формате 1С КлиентБанк.
 *
 * DI-зависимости:
 *  - CreateUncategorizedTransactionService  — экспортируется из BankingCategorizeModule
 *  - UncategorizedBankTransaction.name (TenantModelProxy) — экспортируется из BankingTransactionsModule
 *    через RegisterTenancyModel(UncategorizedBankTransaction) в models[]-exports
 *  - UnitOfWork — глобальный провайдер из TenancyDB
 *  - FeaturesManager — экспортируется из FeaturesModule (серверный гейт флага bank_statement_import)
 */
@Module({
  imports: [BankingCategorizeModule, BankingTransactionsModule, FeaturesModule],
  controllers: [BankStatementImportController],
  providers: [Import1CStatementService],
})
export class BankStatementImportModule {}
