// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DividendPayout } from '../models/DividendPayout.model';

/** История выплат собственнику (новые сверху), с именем счёта списания. */
@Injectable()
export class GetDividendPayoutsService {
  constructor(
    @Inject(DividendPayout.name)
    private readonly payoutModel: TenantModelProxy<typeof DividendPayout>,
  ) {}

  public async getPayouts() {
    const payouts = await this.payoutModel()
      .query()
      .withGraphFetched('paymentAccount')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc');

    return {
      payouts: (payouts as any[]).map((p) => ({
        id: p.id,
        date: moment(p.date).format('YYYY-MM-DD'),
        amount: Number(p.amount) || 0,
        paymentAccountId: p.paymentAccountId,
        paymentAccountName: p.paymentAccount?.name ?? null,
        note: p.note ?? null,
      })),
    };
  }
}
