// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequestInstallment } from '../models/PaymentRequestInstallment.model';

/** Хранилище плановых оплат заявки (FT-053 ТЗ-3). */
@Injectable()
export class PaymentRequestInstallmentsService {
  constructor(
    @Inject(PaymentRequestInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof PaymentRequestInstallment>,
  ) {}

  public list(requestId: number, trx?: Knex.Transaction): Promise<any[]> {
    return this.installmentModel().query(trx).where('requestId', requestId).orderBy('sortOrder', 'asc') as any;
  }

  /** Заменить оплаты целиком: частичная правка могла бы разойтись с суммой. */
  public async replace(
    requestId: number,
    plan: Array<{ dueDate: string; amount: number; accountId: number | null; sortOrder: number }>,
    trx?: Knex.Transaction,
  ) {
    await this.installmentModel().query(trx).where('requestId', requestId).delete();
    for (const item of plan) {
      await this.installmentModel().query(trx).insert({ requestId, ...item } as any);
    }
  }

  public async linkPlan(installmentId: number, plannedOperationId: number, trx?: Knex.Transaction) {
    await this.installmentModel().query(trx).findById(installmentId).patch({ plannedOperationId } as any);
  }
}
