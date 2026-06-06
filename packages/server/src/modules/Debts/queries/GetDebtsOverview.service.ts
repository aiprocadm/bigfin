// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { groupBy, isEmpty } from 'lodash';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { Customer } from '@/modules/Customers/models/Customer';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { GetDebtsOverviewQueryDto } from '../dtos/GetDebtsOverviewQuery.dto';
import {
  DebtContact,
  DebtsOverviewResponse,
  DebtsSideSummary,
} from '../Debts.interfaces';
import { aggregateAging } from '../utils/aggregateAging';
import { summarizeSide } from '../utils/summarizeSide';
import { AGING_PERIODS } from '../constants';

const TOP_N = 5;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const toBase = (dueAmount: number, rate: any): number =>
  round3(Number(dueAmount) * Number(rate || 1));

@Injectable()
export class GetDebtsOverviewService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,

    @Inject(Customer.name)
    private readonly customerModel: TenantModelProxy<typeof Customer>,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,

    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Сводка долгов: дебиторка и/или кредиторка с корзинами старения и ТОПом.
   */
  public async getOverview(
    query: GetDebtsOverviewQueryDto,
  ): Promise<DebtsOverviewResponse> {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const baseCurrency = metadata?.baseCurrency;
    const asDate = query.asDate || moment().format('YYYY-MM-DD');

    const wantReceivable = query.side !== 'payable';
    const wantPayable = query.side !== 'receivable';

    const receivable = wantReceivable
      ? await this.buildReceivable(asDate, query.branchesIds)
      : undefined;
    const payable = wantPayable
      ? await this.buildPayable(asDate, query.branchesIds)
      : undefined;

    const net =
      receivable && payable
        ? round3(receivable.total - payable.total)
        : undefined;

    return { baseCurrency, asDate, receivable, payable, net };
  }

  /** Дебиторка: неоплаченные счета покупателям, сгруппированные по customerId. */
  private async buildReceivable(
    asDate: string,
    branchesIds?: number[],
  ): Promise<DebtsSideSummary> {
    const overdue = await this.saleInvoiceModel()
      .query()
      .modify('overdueInvoicesFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });
    const current = await this.saleInvoiceModel()
      .query()
      .modify('dueInvoicesFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });

    const names = await this.contactNames(this.customerModel);
    const contacts = this.assemble(
      groupBy(overdue as any[], 'customerId'),
      groupBy(current as any[], 'customerId'),
      names,
    );
    return summarizeSide(contacts, TOP_N);
  }

  /** Кредиторка: неоплаченные счета поставщиков, сгруппированные по vendorId. */
  private async buildPayable(
    asDate: string,
    branchesIds?: number[],
  ): Promise<DebtsSideSummary> {
    const overdue = await this.billModel()
      .query()
      .modify('overdueBillsFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });
    const current = await this.billModel()
      .query()
      .modify('dueBillsFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });

    const names = await this.contactNames(this.vendorModel);
    const contacts = this.assemble(
      groupBy(overdue as any[], 'vendorId'),
      groupBy(current as any[], 'vendorId'),
      names,
    );
    return summarizeSide(contacts, TOP_N);
  }

  /** id → отображаемое имя контрагента. */
  private async contactNames(
    model: TenantModelProxy<any>,
  ): Promise<Record<number, string>> {
    const rows = await model().query();
    return (rows as any[]).reduce((acc, r) => {
      acc[r.id] = r.displayName || r.companyName || `#${r.id}`;
      return acc;
    }, {} as Record<number, string>);
  }

  /** Сборка строк реестра из сгруппированных просроченных и текущих документов. */
  private assemble(
    overdueByContact: Record<string, any[]>,
    currentByContact: Record<string, any[]>,
    names: Record<number, string>,
  ): DebtContact[] {
    const ids = new Set<number>([
      ...Object.keys(overdueByContact).map(Number),
      ...Object.keys(currentByContact).map(Number),
    ]);

    const contacts: DebtContact[] = [];
    ids.forEach((contactId) => {
      const overdueDocs = (overdueByContact[contactId] || []).map((doc) => ({
        dueAmount: toBase(doc.dueAmount, doc.exchangeRate),
        overdueDays: Number(doc.overdueDays) || 0,
      }));
      const currentDocs = currentByContact[contactId] || [];
      const current = round3(
        currentDocs.reduce(
          (sum, doc) => sum + toBase(doc.dueAmount, doc.exchangeRate),
          0,
        ),
      );

      const { buckets, overdueTotal, worstBucketIndex } = aggregateAging(
        overdueDocs,
        AGING_PERIODS,
      );

      contacts.push({
        contactId,
        contactName: names[contactId] || `#${contactId}`,
        current,
        buckets,
        overdueTotal,
        total: round3(current + overdueTotal),
        worstBucketIndex,
      });
    });

    return contacts.filter((c) => c.total > 0);
  }
}
