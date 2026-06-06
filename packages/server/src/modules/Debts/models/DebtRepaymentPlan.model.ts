// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DebtRepaymentPlan extends TenantBaseModel {
  side!: string;
  contactId!: number;
  sourceType!: string | null;
  sourceId!: number | null;
  totalAmount!: number;
  currencyCode!: string;
  status!: string;
  description!: string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'debt_repayment_plans';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const {
      DebtRepaymentInstallment,
    } = require('./DebtRepaymentInstallment.model');

    return {
      /**
       * Repayment plan has many installments.
       */
      installments: {
        relation: Model.HasManyRelation,
        modelClass: DebtRepaymentInstallment,
        join: {
          from: 'debt_repayment_plans.id',
          to: 'debt_repayment_installments.planId',
        },
      },
    };
  }
}
