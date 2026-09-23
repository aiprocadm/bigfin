// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/** Плановая оплата внутри заявки (FT-053 ТЗ-3, D18). */
export class PaymentRequestInstallment extends TenantBaseModel {
  requestId!: number;
  dueDate!: string;
  amount!: number;
  accountId!: number | null;
  plannedOperationId!: number | null;
  sortOrder!: number;

  static get tableName() {
    return 'payment_request_installments';
  }

  get timestamps() {
    return [];
  }
}
