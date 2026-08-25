// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ARAgingSummaryService } from '@/modules/FinancialStatements/modules/ARAgingSummary/ARAgingSummaryService';
import { APAgingSummaryService } from '@/modules/FinancialStatements/modules/APAgingSummary/APAgingSummaryService';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

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
  currencyCode: string;
}

@Injectable()
export class GetMoneySummaryService {
  constructor(
    private readonly arAging: ARAgingSummaryService,
    private readonly apAging: APAgingSummaryService,
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

    const [cashBalance, receivable, payable] = await Promise.all([
      this.getCashBalance(),
      this.getAgingTotals('receivable'),
      this.getAgingTotals('payable'),
    ]);

    return {
      cashBalance: this.amount(cashBalance, currencyCode),
      receivable: this.amount(receivable.total, currencyCode),
      receivableOverdue: this.amount(receivable.overdue, currencyCode),
      payable: this.amount(payable.total, currencyCode),
      payableOverdue: this.amount(payable.overdue, currencyCode),
      currencyCode,
    };
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
