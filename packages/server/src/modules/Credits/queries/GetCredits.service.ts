// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Credit } from '../models/Credit.model';

@Injectable()
export class GetCreditsService {
  constructor(
    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
  ) {}

  public async getCredits() {
    const credits: any[] = await this.creditModel()
      .query()
      .withGraphFetched('installments')
      .orderBy('startDate', 'desc');

    return credits.map((c) => {
      const planned = (c.installments || []).filter(
        (i: any) => i.status === 'planned',
      );
      const outstanding = planned.reduce(
        (s: number, i: any) => s + Number(i.principalAmount),
        0,
      );
      const nextPayment = planned
        .slice()
        .sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1))[0];
      const { installments, ...rest } = c;
      return {
        ...rest,
        outstandingPrincipal: Math.round(outstanding * 100) / 100,
        nextPaymentDate: nextPayment?.dueDate ?? null,
        nextPaymentAmount: nextPayment?.paymentAmount ?? null,
      };
    });
  }
}
