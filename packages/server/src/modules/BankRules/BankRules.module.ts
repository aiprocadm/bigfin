import { forwardRef, Module } from '@nestjs/common';
import { CreateBankRuleService } from './commands/CreateBankRule.service';
import { EditBankRuleService } from './commands/EditBankRule.service';
import { DeleteBankRuleService } from './commands/DeleteBankRule.service';
import { GetBankRulesService } from './queries/GetBankRules.service';
import { GetBankRuleService } from './queries/GetBankRule.service';
import { BankRulesApplication } from './BankRulesApplication';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { BankRuleCondition } from './models/BankRuleCondition';
import { BankRule } from './models/BankRule';
import { BankRuleSplit } from './models/BankRuleSplit';
import { TransactionRuleApplication } from './models/TransactionRuleApplication';
import { BankRulesController } from './BankRules.controller';
import { UnlinkBankRuleOnDeleteBankRuleSubscriber } from './events/UnlinkBankRuleOnDeleteBankRule';
import { DeleteBankRulesService } from './commands/DeleteBankRules.service';
import { CommandBankRuleValidatorService } from './commands/CommandBankRuleValidator.service';
import { BankRuleManagementService } from './commands/BankRuleManagement.service';
import { GetTransactionRuleApplicationsService } from './queries/GetTransactionRuleApplications.service';
import { BankingTransactionsRegonizeModule } from '../BankingTranasctionsRegonize/BankingTransactionsRegonize.module';

const models = [
  RegisterTenancyModel(BankRule),
  RegisterTenancyModel(BankRuleCondition),
  RegisterTenancyModel(BankRuleSplit),
  RegisterTenancyModel(TransactionRuleApplication),
];

@Module({
  controllers: [BankRulesController],
  imports: [forwardRef(() => BankingTransactionsRegonizeModule), ...models],
  providers: [
    CreateBankRuleService,
    EditBankRuleService,
    DeleteBankRuleService,
    DeleteBankRulesService,
    CommandBankRuleValidatorService,
    BankRuleManagementService,
    GetTransactionRuleApplicationsService,
    GetBankRuleService,
    GetBankRulesService,
    BankRulesApplication,
    UnlinkBankRuleOnDeleteBankRuleSubscriber,
  ],
  exports: [...models, DeleteBankRuleService, DeleteBankRulesService],
})
export class BankRulesModule {}
