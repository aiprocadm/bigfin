// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtDocument } from '../Debts.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const toBase = (a: number, rate: any): number =>
  round3(Number(a) * Number(rate || 1));
const fmt = (v: any): string => moment(v).format('YYYY-MM-DD');

@Injectable()
export class GetContactDebtsService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,
  ) {}

  /**
   * Неоплаченные документы одного контрагента (drill-down).
   * @param contactId customerId (receivable) или vendorId (payable)
   */
  public async getContactDebts(
    contactId: number,
    side: string,
  ): Promise<DebtDocument[]> {
    if (side === 'payable') {
      const bills = await this.billModel()
        .query()
        .modify('dueBills')
        .onBuild((q) => q.where('vendorId', contactId));
      return (bills as any[]).map((b) => ({
        id: b.id,
        side: 'payable' as const,
        number: `${b.billNumber ?? b.id}`,
        date: fmt(b.billDate ?? b.createdAt),
        dueDate: fmt(b.dueDate),
        total: toBase(b.total ?? b.amount, b.exchangeRate),
        dueAmount: toBase(b.dueAmount, b.exchangeRate),
        overdueDays: Number(b.overdueDays) || 0,
      }));
    }

    const invoices = await this.saleInvoiceModel()
      .query()
      .modify('dueInvoices')
      .modify('delivered')
      .onBuild((q) => q.where('customerId', contactId));
    return (invoices as any[]).map((inv) => ({
      id: inv.id,
      side: 'receivable' as const,
      number: `${inv.invoiceNo ?? inv.id}`,
      date: fmt(inv.invoiceDate ?? inv.createdAt),
      dueDate: fmt(inv.dueDate),
      total: toBase(inv.total, inv.exchangeRate),
      dueAmount: toBase(inv.dueAmount, inv.exchangeRate),
      overdueDays: Number(inv.overdueDays) || 0,
    }));
  }
}
