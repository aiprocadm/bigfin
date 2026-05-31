import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { isEmpty } from 'lodash';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ExchangeRatesService } from '@/modules/ExchangeRates/ExchangeRates.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { GetPaymentCalendarQueryDto } from '../dtos/GetPaymentCalendarQuery.dto';
import {
  DayFlow,
  ForecastLine,
  PaymentCalendarResponse,
} from '../PaymentCalendar.interfaces';
import { computeRunningBalance } from '../utils/computeRunningBalance';
import { expandRecurrence } from '../utils/expandRecurrence';
import { CASH_ACCOUNT_TYPES } from '../constants';

@Injectable()
export class GetPaymentCalendarForecastService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,

    private readonly tenancyContext: TenancyContext,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  /**
   * Builds the payment calendar forecast for the given horizon.
   * @param {number} tenantId
   * @param {GetPaymentCalendarQueryDto} query
   * @returns {Promise<PaymentCalendarResponse>}
   */
  public async getForecast(
    tenantId: number,
    query: GetPaymentCalendarQueryDto,
  ): Promise<PaymentCalendarResponse> {
    const { fromDate, toDate } = query;
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const baseCurrency = metadata?.baseCurrency;

    const openingBalance = await this.getOpeningBalance(
      tenantId,
      baseCurrency,
      query.accountId,
    );

    const lines: Array<{ date: string } & ForecastLine> = [];

    if (query.direction !== 'outflow') {
      lines.push(...(await this.collectInvoiceInflows(query)));
    }
    if (query.direction !== 'inflow') {
      lines.push(...(await this.collectBillOutflows(query)));
    }
    lines.push(
      ...(await this.collectPlannedLines(tenantId, baseCurrency, query)),
    );

    const flows = this.groupByDay(lines, fromDate, toDate);
    const linesByDay = this.indexLinesByDay(lines);

    const { days, gap } = computeRunningBalance(openingBalance, flows);
    days.forEach((day) => {
      day.lines = linesByDay[day.date] || [];
    });

    return {
      baseCurrency,
      openingBalance,
      fromDate,
      toDate,
      days,
      gap,
    };
  }

  /**
   * Current balance of cash+bank accounts, converted to base currency.
   */
  private async getOpeningBalance(
    tenantId: number,
    baseCurrency: string,
    accountId?: number,
  ): Promise<number> {
    const accounts = await this.accountModel()
      .query()
      .onBuild((q) => {
        q.whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);
        if (accountId) {
          q.where('id', accountId);
        }
      });

    let total = 0;
    for (const account of accounts as any[]) {
      total += await this.toBase(
        tenantId,
        Number(account.amount) || 0,
        account.currencyCode,
        baseCurrency,
      );
    }
    return Math.round(total * 1000) / 1000;
  }

  /**
   * Unpaid sale invoices due within the horizon → inflow lines.
   */
  private async collectInvoiceInflows(
    query: GetPaymentCalendarQueryDto,
  ): Promise<Array<{ date: string } & ForecastLine>> {
    const invoices = await this.saleInvoiceModel()
      .query()
      .modify('dueInvoices')
      .modify('delivered')
      .onBuild((q) => {
        q.where('dueDate', '>=', query.fromDate);
        q.where('dueDate', '<=', query.toDate);
        if (!isEmpty(query.branchesIds)) {
          q.modify('filterByBranches', query.branchesIds);
        }
      });

    return (invoices as any[]).map((inv: any) => {
      const outstanding =
        Number(inv.balance) -
        Number(inv.paymentAmount || 0) -
        Number(inv.writtenoffAmount || 0) -
        Number(inv.creditedAmount || 0);
      return {
        date: moment(inv.dueDate).format('YYYY-MM-DD'),
        direction: 'inflow' as const,
        amount:
          Math.round(outstanding * Number(inv.exchangeRate || 1) * 1000) / 1000,
        label: `Счёт №${inv.invoiceNo ?? inv.id}`,
        source: 'invoice' as const,
      };
    });
  }

  /**
   * Unpaid bills due within the horizon → outflow lines.
   */
  private async collectBillOutflows(
    query: GetPaymentCalendarQueryDto,
  ): Promise<Array<{ date: string } & ForecastLine>> {
    const bills = await this.billModel()
      .query()
      .modify('dueBills')
      .onBuild((q) => {
        q.where('dueDate', '>=', query.fromDate);
        q.where('dueDate', '<=', query.toDate);
        if (!isEmpty(query.branchesIds)) {
          q.modify('filterByBranches', query.branchesIds);
        }
      });

    return (bills as any[]).map((bill: any) => {
      const outstanding =
        Number(bill.amount) -
        Number(bill.paymentAmount || 0) -
        Number(bill.creditedAmount || 0);
      return {
        date: moment(bill.dueDate).format('YYYY-MM-DD'),
        direction: 'outflow' as const,
        amount:
          Math.round(outstanding * Number(bill.exchangeRate || 1) * 1000) /
          1000,
        label: `Счёт поставщика №${bill.billNumber ?? bill.id}`,
        source: 'bill' as const,
      };
    });
  }

  /**
   * Manual + recurring planned operations → lines (recurring expanded).
   */
  private async collectPlannedLines(
    tenantId: number,
    baseCurrency: string,
    query: GetPaymentCalendarQueryDto,
  ): Promise<Array<{ date: string } & ForecastLine>> {
    const operations = await this.operationModel()
      .query()
      .onBuild((q) => {
        q.modify('forecastable');
        q.where('plannedDate', '<=', query.toDate);
        if (query.accountId) q.modify('filterByAccount', query.accountId);
        if (query.direction) q.modify('filterByDirection', query.direction);
        if (!isEmpty(query.branchesIds)) {
          q.whereIn('branchId', query.branchesIds);
        }
      });

    const out: Array<{ date: string } & ForecastLine> = [];
    for (const op of operations) {
      const amountBase = await this.toBase(
        tenantId,
        Number(op.amount),
        op.currencyCode,
        baseCurrency,
      );
      const dates: string[] = op.recurrence
        ? expandRecurrence(
            op.recurrence as any,
            moment(op.plannedDate).format('YYYY-MM-DD'),
            query.fromDate,
            query.toDate,
          )
        : this.withinRange(
            moment(op.plannedDate).format('YYYY-MM-DD'),
            query.fromDate,
            query.toDate,
          );

      dates.forEach((date) => {
        out.push({
          date,
          direction: op.direction as 'inflow' | 'outflow',
          amount: amountBase,
          label:
            op.description ||
            (op.recurrence ? 'Повтор' : 'Плановая операция'),
          source: op.recurrence ? 'recurring' : 'manual',
        });
      });
    }
    return out;
  }

  /**
   * Converts an amount to base currency via the latest rate (identity if same).
   */
  private async toBase(
    tenantId: number,
    amount: number,
    fromCurrency: string,
    baseCurrency: string,
  ): Promise<number> {
    if (!fromCurrency || fromCurrency === baseCurrency) return amount;
    const { exchangeRate } = await this.exchangeRates.latest(tenantId, {
      fromCurrency,
      toCurrency: baseCurrency,
    } as any);
    return Math.round(amount * Number(exchangeRate || 1) * 1000) / 1000;
  }

  private withinRange(date: string, from: string, to: string): string[] {
    return moment(date).isBetween(from, to, 'day', '[]') ? [date] : [];
  }

  /**
   * Groups lines into one DayFlow per day across the whole horizon.
   */
  private groupByDay(
    lines: Array<{ date: string } & ForecastLine>,
    fromDate: string,
    toDate: string,
  ): DayFlow[] {
    const map = new Map<string, DayFlow>();
    const cursor = moment(fromDate);
    const end = moment(toDate);
    while (cursor.isSameOrBefore(end, 'day')) {
      const key = cursor.format('YYYY-MM-DD');
      map.set(key, { date: key, inflow: 0, outflow: 0 });
      cursor.add(1, 'day');
    }
    lines.forEach((line) => {
      const day = map.get(line.date);
      if (!day) return;
      if (line.direction === 'inflow') day.inflow += line.amount;
      else day.outflow += line.amount;
    });
    return Array.from(map.values());
  }

  private indexLinesByDay(
    lines: Array<{ date: string } & ForecastLine>,
  ): Record<string, ForecastLine[]> {
    return lines.reduce((acc, line) => {
      (acc[line.date] = acc[line.date] || []).push(line);
      return acc;
    }, {} as Record<string, ForecastLine[]>);
  }
}
