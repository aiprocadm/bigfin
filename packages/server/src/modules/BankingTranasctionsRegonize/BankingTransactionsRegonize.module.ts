import { forwardRef, Module } from '@nestjs/common';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { RecognizedBankTransaction } from './models/RecognizedBankTransaction';
import { RevertRecognizedTransactionsService } from './commands/RevertRecognizedTransactions.service';
import { RecognizeTranasctionsService } from './commands/RecognizeTranasctions.service';
import { TriggerRecognizedTransactionsSubscriber } from './events/TriggerRecognizedTransactions';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { BankRulesModule } from '../BankRules/BankRules.module';
import { BankingRecognizedTransactionsController } from './BankingRecognizedTransactions.controller';
import { RecognizedTransactionsApplication } from './RecognizedTransactions.application';
import { GetRecognizedTransactionsService } from './GetRecongizedTransactions';
import { GetRecognizedTransactionService } from './queries/GetRecognizedTransaction.service';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullModule } from '@nestjs/bullmq';
import { RecognizeUncategorizedTransactionsQueue } from './_types';
import { RegonizeTransactionsPrcessor } from './jobs/RecognizeTransactionsJob';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { ApplyBankRuleService } from './commands/ApplyBankRule.service';
import { ApplyRuleToPastService } from './commands/ApplyRuleToPast.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { TransactionSplitsModule } from '../TransactionSplits/TransactionSplits.module';

const models = [RegisterTenancyModel(RecognizedBankTransaction)];

@Module({
  imports: [
    BankingTransactionsModule,
    TenancyModule,
    // Правило разносит строку тем же путём, что и человек (FT-030 ТЗ-3).
    forwardRef(() => BankingCategorizeModule),
    TransactionSplitsModule,
    forwardRef(() => BankRulesModule),
    BullModule.registerQueue({
      name: RecognizeUncategorizedTransactionsQueue,
    }),
    BullBoardModule.forFeature({
      name: RecognizeUncategorizedTransactionsQueue,
      adapter: BullMQAdapter,
    }),
    ...models,
  ],
  providers: [
    RecognizedTransactionsApplication,
    GetRecognizedTransactionsService,
    RevertRecognizedTransactionsService,
    RecognizeTranasctionsService,
    ApplyBankRuleService,
    ApplyRuleToPastService,
    TriggerRecognizedTransactionsSubscriber,
    GetRecognizedTransactionService,
    RegonizeTransactionsPrcessor,
  ],
  exports: [
    ...models,
    RevertRecognizedTransactionsService,
    RecognizeTranasctionsService,
    ApplyRuleToPastService,
  ],
  controllers: [BankingRecognizedTransactionsController],
})
export class BankingTransactionsRegonizeModule {}
