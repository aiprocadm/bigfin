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
import { aggregateForecast } from '../utils/aggregateForecast';
import { expandRecurrence } from '../utils/expandRecurrence';
import { resolveDocumentExchangeRate } from '../utils/resolveDocumentExchangeRate';
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

    // Строки, которые нечем пересчитать в базовую валюту. Считаем их и
    // говорим человеку — молчаливая единица завышала прогноз (Р1 карты v16).
    const unconverted = { count: 0 };

    const openingBalance = await this.getOpeningBalance(
      tenantId,
      baseCurrency,
      query.accountId,
    );

    const lines: Array<{ date: string } & ForecastLine> = [];

    if (query.direction !== 'outflow') {
      lines.push(
        ...(await this.collectInvoiceInflows(query, baseCurrency, unconverted)),
      );
    }
    if (query.direction !== 'inflow') {
      lines.push(
        ...(await this.collectBillOutflows(query, baseCurrency, unconverted)),
      );
    }
    lines.push(
      ...(await this.collectPlannedLines(tenantId, baseCurrency, query)),
    );

    const flows = this.groupByDay(lines, fromDate, toDate);
    const linesByDay = this.indexLinesByDay(lines);

    const { days, gap, gaps } = computeRunningBalance(openingBalance, flows);
    days.forEach((day) => {
      day.lines = linesByDay[day.date] || [];
    });

    /**
     * Столбцы выбранного масштаба (FIN-019 ТЗ-2).
     *
     * Дни остаются в ответе всегда: на них держатся лента денег на главной,
     * оповещение о разрыве и виджет в шапке. Укрупнение идёт ДОПОЛНИТЕЛЬНЫМ
     * полем — так ни один нынешний читатель ответа не замечает изменения.
     */
    const periods = aggregateForecast(
      days,
      (query as any)?.granularity ?? 'day',
    );

    return {
      baseCurrency,
      unconvertedCount: unconverted.count,
      openingBalance,
      fromDate,
      toDate,
      days,
      periods,
      granularity: (query as any)?.granularity ?? 'day',
      source: (query as any)?.source ?? 'cashflow',
      gap,
      gaps,
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
    baseCurrency: string,
    unconverted: { count: number },
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

    return (invoices as any[])
      .map((inv: any) => {
        // Берём долг у самой модели: там итог с налогом, скидкой и
        // корректировкой. Раньше сумма считалась здесь заново от подытога — и
        // счёт с НДС, оплаченный без налога, попадал в календарь строкой «0 ₽».
        const outstanding = Number(inv.dueAmount);
        const rate = resolveDocumentExchangeRate(
          inv.currencyCode,
          baseCurrency,
          inv.exchangeRate,
        );
        if (rate === null) {
          unconverted.count += 1;
          return null;
        }
        return {
          date: moment(inv.dueDate).format('YYYY-MM-DD'),
          direction: 'inflow' as const,
          amount: Math.round(outstanding * rate * 1000) / 1000,
          label: `Счёт №${inv.invoiceNo ?? inv.id}`,
          source: 'invoice' as const,
        };
      })
      .filter(Boolean) as Array<{ date: string } & ForecastLine>;
  }

  /**
   * Unpaid bills due within the horizon → outflow lines.
   */
  private async collectBillOutflows(
    query: GetPaymentCalendarQueryDto,
    baseCurrency: string,
    unconverted: { count: number },
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

    return (bills as any[])
      .map((bill: any) => {
        // Тот же долг, что и в карточке счёта поставщика.
        const outstanding = Number(bill.dueAmount);
        const rate = resolveDocumentExchangeRate(
          bill.currencyCode,
          baseCurrency,
          bill.exchangeRate,
        );
        if (rate === null) {
          unconverted.count += 1;
          return null;
        }
        return {
          date: moment(bill.dueDate).format('YYYY-MM-DD'),
          direction: 'outflow' as const,
          amount: Math.round(outstanding * rate * 1000) / 1000,
          label: `Счёт поставщика №${bill.billNumber ?? bill.id}`,
          source: 'bill' as const,
        };
      })
      .filter(Boolean) as Array<{ date: string } & ForecastLine>;
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
          plannedOperationId: op.id,
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
    // Без «|| 1»: служба курсов теперь либо возвращает курс больше нуля,
    // либо отказывает. Подстановка единицы молча считала бы валютную
    // операцию один к одному и завышала прогноз (М3 карты v15).
    return Math.round(amount * Number(exchangeRate) * 1000) / 1000;
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
