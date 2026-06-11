// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DividendPayout extends TenantBaseModel {
  date!: string;
  amount!: number;
  paymentAccountId!: number;
  equityAccountId!: number;
  note!: string | null;

  static get tableName() {
    return 'dividend_payouts';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Account } = require('@/modules/Accounts/models/Account.model');

    return {
      paymentAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'dividend_payouts.paymentAccountId',
          to: 'accounts.id',
        },
      },
    };
  }
}
