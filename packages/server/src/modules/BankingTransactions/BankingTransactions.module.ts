import { Module } from '@nestjs/common';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { UncategorizedBankTransaction } from './models/UncategorizedBankTransaction';
import { BankTransactionLine } from './models/BankTransactionLine';
import { BankTransaction } from './models/BankTransaction';
import { BankTransactionAutoIncrement } from './commands/BankTransactionAutoIncrement.service';
import { BankTransactionsExportable } from './commands/BankTransactionsExportable';
import { BankingTransactionGLEntriesSubscriber } from './subscribers/CashflowTransactionSubscriber';
import { DecrementUncategorizedTransactionOnCategorizeSubscriber } from './subscribers/DecrementUncategorizedTransactionOnCategorize';
import { DeleteCashflowTransactionOnUncategorizeSubscriber } from './subscribers/DeleteCashflowTransactionOnUncategorize';
import { PreventDeleteTransactionOnDeleteSubscriber } from './subscribers/PreventDeleteTransactionsOnDelete';
import { ValidateDeleteBankAccountTransactions } from './commands/ValidateDeleteBankAccountTransactions.service';
import { BankTransactionGLEntriesService } from './commands/BankTransactionGLEntries';
import { BankingTransactionsApplication } from './BankingTransactionsApplication.service';
import { AutoIncrementOrdersModule } from '../AutoIncrementOrders/AutoIncrementOrders.module';
import { DeleteCashflowTransaction } from './commands/DeleteCashflowTransaction.service';
import { CreateBankTransactionService } from './commands/CreateBankTransaction.service';
import { GetBankTransactionService } from './queries/GetBankTransaction.service';
import { CommandBankTransactionValidator } from './commands/CommandCasflowValidator.service';
import { BranchTransactionDTOTransformer } from '../Branches/integrations/BranchTransactionDTOTransform';
import { BranchesModule } from '../Branches/Branches.module';
import { RemovePendingUncategorizedTransaction } from './commands/RemovePendingUncategorizedTransaction.service';
import { BankingTransactionsController } from './controllers/BankingTransactions.controller';
import { GetTransactionsSummaryService } from './queries/GetTransactionsSummary.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetBankAccountsService } from './queries/GetBankAccounts.service';
import { DynamicListModule } from '../DynamicListing/DynamicList.module';
import { BankAccount } from './models/BankAccount';
import { LedgerModule } from '../Ledger/Ledger.module';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { GetBankAccountTransactionsService } from './queries/GetBankAccountTransactions/GetBankAccountTransactions.service';
import { GetBankAccountTransactionsRepository } from './queries/GetBankAccountTransactions/GetBankAccountTransactionsRepo.service';
import { GetUncategorizedTransactions } from './queries/GetUncategorizedTransactions';
import { GetUncategorizedBankTransactionService } from './queries/GetUncategorizedBankTransaction.service';
import { BankingUncategorizedTransactionsController } from './controllers/BankingUncategorizedTransactions.controller';
import { BankingPendingTransactionsController } from './controllers/BankingPendingTransactions.controller';
import { GetPendingBankAccountTransactions } from './queries/GetPendingBankAccountTransaction.service';
import { GetAutofillCategorizeTransactionService } from './queries/GetAutofillCategorizeTransaction/GetAutofillCategorizeTransaction.service';
import { GetContactCategoryMemoryService } from './queries/GetContactCategoryMemory/GetContactCategoryMemory.service';
import { ContactsModule } from '../Contacts/Contacts.module';

import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';

const models = [
  RegisterTenancyModel(UncategorizedBankTransaction),
  RegisterTenancyModel(BankTransaction),
  RegisterTenancyModel(BankTransactionLine),
  RegisterTenancyModel(BankAccount),
  // Документы строк реестра: по ним считаются состояния «нам должны»,
  // «мы должны» и «просрочено» (FIN-003). Остаток к оплате и срок живут
  // не в проводке, а в породившем её документе.
  RegisterTenancyModel(SaleInvoice),
  RegisterTenancyModel(Bill),
];

@Module({
  imports: [
    AutoIncrementOrdersModule,
    LedgerModule,
    BranchesModule,
    DynamicListModule,
    TenancyModule,
    ContactsModule,
    ...models,
  ],
  controllers: [
    BankingTransactionsController,
    BankingUncategorizedTransactionsController,
    BankingPendingTransactionsController,
  ],
  providers: [
    GetTransactionsSummaryService,
    TenancyContext,
    BankTransactionsExportable,
    BankTransactionAutoIncrement,
    BankTransactionGLEntriesService,
    ValidateDeleteBankAccountTransactions,
    BankingTransactionGLEntriesSubscriber,
    DecrementUncategorizedTransactionOnCategorizeSubscriber,
    DeleteCashflowTransactionOnUncategorizeSubscriber,
    PreventDeleteTransactionOnDeleteSubscriber,
    BankingTransactionsApplication,
    DeleteCashflowTransaction,
    CreateBankTransactionService,
    GetBankTransactionService,
    GetBankAccountsService,
    CommandBankTransactionValidator,
    BranchTransactionDTOTransformer,
    RemovePendingUncategorizedTransaction,
    GetBankAccountTransactionsRepository,
    GetBankAccountTransactionsService,
    GetUncategorizedTransactions,
    GetUncategorizedBankTransactionService,
    GetPendingBankAccountTransactions,
    GetAutofillCategorizeTransactionService,
    GetContactCategoryMemoryService,
  ],
  exports: [
    ...models,
    RemovePendingUncategorizedTransaction,
    CommandBankTransactionValidator,
    CreateBankTransactionService
  ],
})
export class BankingTransactionsModule { }
