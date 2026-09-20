// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ARAgingSummaryService } from '@/modules/FinancialStatements/modules/ARAgingSummary/ARAgingSummaryService';
import { APAgingSummaryService } from '@/modules/FinancialStatements/modules/APAgingSummary/APAgingSummaryService';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetContactDebtBreakdownService } from '@/modules/Contacts/queries/GetContactDebtBreakdown.service';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import * as moment from 'moment';
import { GetTaxEstimateService } from './GetTaxEstimate.service';

export interface MoneySummaryAmount {
  amount: number;
  formattedAmount: string;
}

export interface MoneySummary {
  /** Остатки на денежных счетах. */
  cashBalance: MoneySummaryAmount;
  /** Сколько должны нам — всего и сколько из этого просрочено. */
  receivable: MoneySummaryAmount;
  receivableOverdue: MoneySummaryAmount;
  /** Сколько должны мы — всего и просрочено. */
  payable: MoneySummaryAmount;
  payableOverdue: MoneySummaryAmount;
  /**
   * Ближайшие платежи: сколько предстоит заплатить в течение недели и
   * когда ближайший. Считает платёжный календарь — тот же прогноз, что
   * показывает раздел «Платёжный календарь».
   */
  upcomingPayments: MoneySummaryAmount;
  upcomingPaymentsDate: string | null;
  /**
   * Оценка налога на упрощёнке за текущий квартал (Н3 карты v22).
   * `null` — организация не на упрощёнке или режим не задан: тогда плитка
   * не показывается, молчание честнее выдуманной цифры.
   */
  taxEstimate: MoneySummaryAmount | null;
  taxEstimateRatePercent: number | null;
  taxEstimateDueDate: string | null;
  /**
   * Авансы: полученные от покупателей и выданные поставщикам (FIN-023).
   *
   * Стоят рядом с долгами НАМЕРЕННО и не складываются с ними. Полученный
   * аванс закрывается работой, выданный — поставкой: в ожидаемые
   * поступления они не входят, и сложить их с долгом деньгами значит
   * обещать себе денег больше, чем будет.
   */
  advancesReceived: MoneySummaryAmount;
  advancesPaid: MoneySummaryAmount;
  currencyCode: string;
}

/** На сколько дней вперёд смотрит плитка «Ближайшие платежи». */
export const UPCOMING_PAYMENTS_DAYS = 7;

@Injectable()
export class GetMoneySummaryService {
  constructor(
    private readonly arAging: ARAgingSummaryService,
    private readonly apAging: APAgingSummaryService,
    private readonly paymentCalendar: GetPaymentCalendarForecastService,
    private readonly taxEstimate: GetTaxEstimateService,
    private readonly debtBreakdown: GetContactDebtBreakdownService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Сводка «как дела с деньгами» для главной страницы (Г2 карты v20).
   *
   * Все цифры берутся из ТЕХ ЖЕ отчётов, что показывают разделы продукта:
   * долги покупателей и поставщиков — из отчётов по срокам задолженности,
   * остатки — из денежных счетов. Второго способа считать те же суммы быть
   * не должно: иначе главная и раздел разойдутся, и верить будет нечему.
   */
  public async getMoneySummary(): Promise<MoneySummary> {
    const metadata = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency ?? 'RUB';

    const [cashBalance, receivable, payable, upcoming, tax, advances] =
      await Promise.all([
        this.getCashBalance(),
        this.getAgingTotals('receivable'),
        this.getAgingTotals('payable'),
        this.getUpcomingPayments((metadata as any)?.tenantId),
        this.taxEstimate.getTaxEstimate(moment().format('YYYY-MM-DD')),
        // АВАНСЫ ЕДУТ ЭТИМ ЖЕ ОТВЕТОМ (FIN-023). Отдельный запрос с главной
        // был бы вторым запросом на самом частом экране ради одной строки.
        this.getAdvances(),
      ]);

    return {
      cashBalance: this.amount(cashBalance, currencyCode),
      receivable: this.amount(receivable.total, currencyCode),
      receivableOverdue: this.amount(receivable.overdue, currencyCode),
      payable: this.amount(payable.total, currencyCode),
      payableOverdue: this.amount(payable.overdue, currencyCode),
      upcomingPayments: this.amount(upcoming.total, currencyCode),
      upcomingPaymentsDate: upcoming.nearestDate,
      taxEstimate: tax ? this.amount(tax.amount, currencyCode) : null,
      taxEstimateRatePercent: tax?.ratePercent ?? null,
      taxEstimateDueDate: tax?.dueDate ?? null,
      advancesReceived: this.amount(advances.received, currencyCode),
      advancesPaid: this.amount(advances.paid, currencyCode),
      currencyCode,
    };
  }

  /**
   * Авансы полученные и выданные.
   *
   * Сбой не роняет сводку: остаток и долги важнее одной строки.
   */
  private async getAdvances(): Promise<{ received: number; paid: number }> {
    try {
      const breakdown = await this.debtBreakdown.getDebtBreakdown();

      return {
        received: breakdown.totals.advancesReceived,
        paid: breakdown.totals.advancesPaid,
      };
    } catch {
      return { received: 0, paid: 0 };
    }
  }

  /**
   * Сумма остатков денежных счетов: расчётные счета и касса.
   */
  private async getCashBalance(): Promise<number> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', [ACCOUNT_TYPE.BANK, ACCOUNT_TYPE.CASH])
      .where('active', true);

    return accounts.reduce(
      (sum: number, account: any) => sum + Number(account.amount ?? 0),
      0,
    );
  }

  /**
   * Итоги по срокам задолженности: всего и сколько просрочено.
   *
   * «Просрочено» — это всё, кроме графы «текущее»: отчёт раскладывает долг
   * по корзинам просрочки, и сумма корзин и есть просроченная часть.
   */
  private async getAgingTotals(
    side: 'receivable' | 'payable',
  ): Promise<{ total: number; overdue: number }> {
    try {
      const report =
        side === 'receivable'
          ? await this.arAging.ARAgingSummary({} as any)
          : await this.apAging.APAgingSummary({} as any);

      const totals = (report as any)?.data?.total;
      const total = Number(totals?.total?.amount ?? 0);
      const current = Number(totals?.current?.amount ?? 0);

      return { total, overdue: Math.max(total - current, 0) };
    } catch (error) {
      // Сводка не должна ронять главную страницу: пустая организация или
      // недоступный отчёт — это ноль, а не ошибка на весь экран.
      console.error(`[money-summary] ${side} aging failed:`, error);
      return { total: 0, overdue: 0 };
    }
  }

  /**
   * Ближайшие платежи: сколько предстоит заплатить за неделю вперёд и когда
   * ближайший день с расходом (Р3 карты v21).
   *
   * Считаем не сами — спрашиваем платёжный календарь. Он уже умеет всё
   * сложное: счета поставщиков, плановые и повторяющиеся операции, пересчёт
   * валют. Второго способа считать те же суммы быть не должно, иначе
   * главная и раздел разойдутся.
   */
  private async getUpcomingPayments(
    tenantId: number,
  ): Promise<{ total: number; nearestDate: string | null }> {
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment()
      .add(UPCOMING_PAYMENTS_DAYS - 1, 'days')
      .format('YYYY-MM-DD');

    try {
      const forecast = await this.paymentCalendar.getForecast(tenantId, {
        fromDate,
        toDate,
      } as any);

      const days = forecast?.days ?? [];
      const total = days.reduce(
        (sum: number, day: any) => sum + Number(day?.outflow ?? 0),
        0,
      );
      const nearest = days.find((day: any) => Number(day?.outflow ?? 0) > 0);

      return { total, nearestDate: nearest?.date ?? null };
    } catch (error) {
      // Как и с отчётами: сбой прогноза — это пустая плитка, а не ошибка на
      // весь экран.
      console.error('[money-summary] payment calendar failed:', error);
      return { total: 0, nearestDate: null };
    }
  }

  /**
   * Число и его же читаемая запись — форматирование живёт на сервере, как
   * у остальных денежных полей продукта.
   */
  private amount(value: number, currencyCode: string): MoneySummaryAmount {
    return {
      amount: value,
      formattedAmount: new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(value),
    };
  }
}
