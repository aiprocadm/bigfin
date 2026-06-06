// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DebtRepaymentInstallment extends TenantBaseModel {
  planId!: number;
  dueDate!: string;
  amount!: number;
  status!: string;
  paidAt!: string | null;
  note!: string | null;
  sortOrder!: number;

  /**
   * Table name.
   */
  static get tableName() {
    return 'debt_repayment_installments';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
