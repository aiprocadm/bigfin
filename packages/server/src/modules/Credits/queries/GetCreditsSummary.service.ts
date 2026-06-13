// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreditInstallment } from '../models/CreditInstallment.model';

@Injectable()
export class GetCreditsSummaryService {
  constructor(
    @Inject(CreditInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof CreditInstallment>,
  ) {}

  public async getSummary() {
    const planned: any[] = await this.installmentModel()
      .query()
      .where('status', 'planned');
    const totalOutstanding = planned.reduce(
      (s, i) => s + Number(i.principalAmount),
      0,
    );
    const next = planned
      .slice()
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      nextPaymentDate: next?.dueDate ?? null,
      nextPaymentAmount: next?.paymentAmount ?? null,
    };
  }
}
