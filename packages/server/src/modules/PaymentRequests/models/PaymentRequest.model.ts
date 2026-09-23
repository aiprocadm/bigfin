// © 2026 Bigfin
import { Model } from 'objection';
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
  /** Ссылка на документ и обоснование платежа (FT-053 ТЗ-3, D17). */
  documentUrl!: string | null;
  justification!: string | null;
  installments?: any[];

  /** Колонки, по которым ищет поиск в шапке (Р3 карты v43). */
  static get searchColumns() {
    return ['description'];
  }

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

  /** Плановые оплаты заявки (FT-053 ТЗ-3). */
  static get relationMappings() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PaymentRequestInstallment } = require('./PaymentRequestInstallment.model');
    return {
      installments: {
        relation: Model.HasManyRelation,
        modelClass: PaymentRequestInstallment,
        join: {
          from: 'payment_requests.id',
          to: 'payment_request_installments.requestId',
        },
        modify: (query: any) => query.orderBy('sortOrder', 'asc'),
      },
    };
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
