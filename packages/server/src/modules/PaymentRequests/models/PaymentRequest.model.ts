// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PaymentRequest extends TenantBaseModel {
  amount!: number;
  currencyCode!: string;
  articleId!: number | null;
  contactId!: number | null;
  accountId!: number | null;
  branchId!: number | null;
  dueDate!: string;
  description!: string | null;
  status!: string;
  createdBy!: number;
  approvedBy!: number | null;
  approvedAt!: string | null;
  plannedOperationId!: number | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'payment_requests';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Query modifiers.
   */
  static get modifiers() {
    return {
      /**
       * Filter by request status.
       */
      filterByStatus(query, status: string) {
        query.where('status', status);
      },
    };
  }
}
