// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Credit extends TenantBaseModel {
  name!: string;
  lender!: string | null;
  principalAmount!: number;
  annualInterestRate!: number;
  termMonths!: number;
  startDate!: string;
  scheduleType!: string;
  paymentAccountId!: number;
  liabilityAccountId!: number | null;
  interestExpenseAccountId!: number | null;
  status!: string;
  note!: string | null;

  static get tableName() {
    return 'credits';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      CreditInstallment,
    } = require('./CreditInstallment.model');
    const { Account } = require('../../Accounts/models/Account.model');

    return {
      installments: {
        relation: Model.HasManyRelation,
        modelClass: CreditInstallment,
        join: {
          from: 'credits.id',
          to: 'credit_installments.creditId',
        },
      },
      paymentAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: { from: 'credits.paymentAccountId', to: 'accounts.id' },
      },
    };
  }
}
