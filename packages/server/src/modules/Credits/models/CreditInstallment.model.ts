// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class CreditInstallment extends TenantBaseModel {
  creditId!: number;
  seqNo!: number;
  dueDate!: string;
  paymentAmount!: number;
  principalAmount!: number;
  interestAmount!: number;
  remainingBalance!: number;
  status!: string;
  paidDate!: string | null;

  static get tableName() {
    return 'credit_installments';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Credit } = require('./Credit.model');
    return {
      credit: {
        relation: Model.BelongsToOneRelation,
        modelClass: Credit,
        join: { from: 'credit_installments.creditId', to: 'credits.id' },
      },
    };
  }
}
