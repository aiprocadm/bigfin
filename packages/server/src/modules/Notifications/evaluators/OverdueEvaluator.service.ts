// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Candidate } from '../utils/selectToFire';
import { overdueDecide } from './overdueDecide';

@Injectable()
export class OverdueEvaluatorService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,
  ) {}

  public async evaluate(_threshold: any): Promise<Candidate[]> {
    const today = moment().format('YYYY-MM-DD');

    const invoices: any[] = await this.saleInvoiceModel()
      .query()
      .modify('overdueInvoicesFromDate', today);

    const mapped = invoices.map((inv: any) => ({
      id: inv.id as number,
      amount: Number(inv.dueAmount) || 0,
      dueDate: moment(inv.dueDate).format('YYYY-MM-DD'),
    }));

    return overdueDecide(mapped);
  }
}
