import { Module } from '@nestjs/common';
import { BankAccountsApplication } from './BankAccountsApplication.service';
import { DisconnectBankAccountService } from './commands/DisconnectBankAccount.service';
import { RefreshBankAccountService } from './commands/RefreshBankAccount.service';
import { ResumeBankAccountFeedsService } from './commands/ResumeBankAccountFeeds.service';
import { PauseBankAccountFeeds } from './commands/PauseBankAccountFeeds.service';
import { DeleteUncategorizedTransactionsOnAccountDeleting } from './subscribers/DeleteUncategorizedTransactionsOnAccountDeleting';
import { DisconnectPlaidItemOnAccountDeleted } from './subscribers/DisconnectPlaidItemOnAccountDeleted';
import { BankAccountsController } from './BankAccounts.controller';
import { AccountGroupsController } from './AccountGroups.controller';
import { AccountGroupsService } from './queries/AccountGroups.service';
import { BankingPlaidModule } from '../BankingPlaid/BankingPlaid.module';
import { PlaidModule } from '../Plaid/Plaid.module';
import { BankRulesModule } from '../BankRules/BankRules.module';
import { BankingTransactionsRegonizeModule } from '../BankingTranasctionsRegonize/BankingTransactionsRegonize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { GetBankAccountsService } from './queries/GetBankAccounts';
import { DynamicListModule } from '../DynamicListing/DynamicList.module';
import { GetBankAccountSummary } from './queries/GetBankAccountSummary';
import { MutateBaseCurrencyAccountsSubscriber } from '../Accounts/susbcribers/MutateBaseCurrencyAccounts.subscriber';
import { MutateBaseCurrencyAccounts } from '../Accounts/MutateBaseCurrencyAccounts';
import { GetAccountsTaxEstimateService } from './queries/GetAccountsTaxEstimate.service';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

@Module({
  imports: [
    BankingPlaidModule,
    PlaidModule,
    BankRulesModule,
    BankingTransactionsRegonizeModule,
    BankingTransactionsModule,
    DynamicListModule,
  ],
  providers: [
    DisconnectBankAccountService,
    RefreshBankAccountService,
    ResumeBankAccountFeedsService,
    PauseBankAccountFeeds,
    DeleteUncategorizedTransactionsOnAccountDeleting,
    DisconnectPlaidItemOnAccountDeleted,
    BankAccountsApplication,
    GetBankAccountsService,
    GetBankAccountSummary,
    MutateBaseCurrencyAccounts,
    MutateBaseCurrencyAccountsSubscriber,
    AccountGroupsService,
    // Оценка налога по режимам счетов (FT-070 ТЗ-3) — её зовёт оценка на
    // главной, поэтому провайдер обязан быть и в exports.
    GetAccountsTaxEstimateService,
    TenancyContext,
  ],
  exports: [
    BankAccountsApplication,
    AccountGroupsService,
    GetAccountsTaxEstimateService,
  ],
  controllers: [BankAccountsController, AccountGroupsController],
})
export class BankAccountsModule {}
