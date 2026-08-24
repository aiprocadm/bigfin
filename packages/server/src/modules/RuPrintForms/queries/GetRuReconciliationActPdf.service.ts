// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import {
  renderRuReconciliationActTemplateHtml,
  RuReconciliationActTemplateProps,
  RuReconciliationLine,
} from '@bigfin/pdf-templates';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TransactionsByCustomersSheet } from '@/modules/FinancialStatements/modules/TransactionsByCustomer/TransactionsByCustomersService';
import { Customer } from '@/modules/Customers/models/Customer';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  amountToWordsRu,
  formatDateNumericRu,
  formatDateRu,
  formatMoneyRu,
} from '../utils/amountToWordsRu';
import {
  buildBuyerLine,
  buildSellerLine,
  buildSignerProps,
} from '../utils/ruFormMapping';

export interface ReconciliationActPeriod {
  fromDate: string;
  toDate: string;
}

@Injectable()
export class GetRuReconciliationActPdf {
  constructor(
    private readonly chromiumlyTenancy: ChromiumlyTenancy,
    private readonly tenancyContext: TenancyContext,
    private readonly transactionsByCustomers: TransactionsByCustomersSheet,

    @Inject(Customer.name)
    private readonly customerModel: TenantModelProxy<typeof Customer>,
  ) {}

  /**
   * HTML печатной формы (превью и отладка).
   */
  public async getReconciliationActHtml(
    customerId: number,
    period: ReconciliationActPeriod,
  ): Promise<string> {
    const props = await this.getReconciliationActProps(customerId, period);

    return renderRuReconciliationActTemplateHtml(props);
  }

  /**
   * PDF печатной формы.
   * @returns {Promise<[Buffer, string]>} [содержимое, имя файла]
   */
  public async getReconciliationActPdf(
    customerId: number,
    period: ReconciliationActPeriod,
  ): Promise<[Buffer, string]> {
    const htmlContent = await this.getReconciliationActHtml(customerId, period);
    const buffer = await this.chromiumlyTenancy.convertHtmlContent(htmlContent);

    return [buffer, `Akt-sverki-${customerId}-${period.fromDate}`];
  }

  /**
   * Собирает данные акта сверки: обороты по контрагенту за период берутся
   * из того же отчёта, что показывает раздел «Обороты по покупателю» —
   * второго способа считать сальдо в продукте быть не должно.
   */
  public async getReconciliationActProps(
    customerId: number,
    period: ReconciliationActPeriod,
  ): Promise<RuReconciliationActTemplateProps> {
    const tenant = await this.tenancyContext.getTenant(true);
    const metadata = tenant.metadata;

    const customer = await this.customerModel()
      .query()
      .findById(customerId)
      .throwIfNotFound();

    const statement = await this.transactionsByCustomers.transactionsByCustomers(
      {
        fromDate: period.fromDate,
        toDate: period.toDate,
        customersIds: [customerId],
        // Контрагент с нулевыми оборотами всё равно должен попасть в акт:
        // «сверились и разошлись в ноль» — законный итог сверки.
        noneTransactions: false,
        noneZero: false,
      } as any,
    );
    const report = statement.data?.[0];

    return {
      ...buildSignerProps(metadata),
      periodLabel: `${formatDateNumericRu(period.fromDate)} — ${formatDateNumericRu(period.toDate)}`,
      documentDate: formatDateRu(new Date()),
      organizationLine: buildSellerLine(metadata),
      counterpartyLine: buildBuyerLine(customer),
      ...this.buildAmounts(report),
    };
  }

  /**
   * Строки и итоги акта из отчёта по оборотам.
   */
  private buildAmounts(report: any) {
    const transactions = report?.transactions ?? [];

    const lines: RuReconciliationLine[] = transactions.map((entry: any) => ({
      date: formatDateNumericRu(entry.date),
      title: [entry.transactionType, entry.transactionNumber]
        .filter(Boolean)
        .join(' '),
      debit: entry.debit?.amount ? formatMoneyRu(entry.debit.amount) : '',
      credit: entry.credit?.amount ? formatMoneyRu(entry.credit.amount) : '',
    }));

    const totalDebit = transactions.reduce(
      (sum: number, entry: any) => sum + (entry.debit?.amount ?? 0),
      0,
    );
    const totalCredit = transactions.reduce(
      (sum: number, entry: any) => sum + (entry.credit?.amount ?? 0),
      0,
    );
    const openingAmount = report?.openingBalance?.amount ?? 0;
    const closingAmount = report?.closingBalance?.amount ?? 0;

    return {
      lines,
      openingBalance: formatMoneyRu(openingAmount),
      totalDebit: formatMoneyRu(totalDebit),
      totalCredit: formatMoneyRu(totalCredit),
      closingBalance: formatMoneyRu(closingAmount),
      closingBalanceText: this.buildClosingText(closingAmount),
      closingBalanceInWords:
        closingAmount === 0 ? '' : amountToWordsRu(Math.abs(closingAmount)),
    };
  }

  /**
   * Пояснение к конечному сальдо простыми словами: кто кому должен.
   * Ради этой строки акт сверки обычно и читают.
   */
  private buildClosingText(closingAmount: number): string {
    if (closingAmount === 0) {
      return 'На конец периода задолженность отсутствует.';
    }
    return closingAmount > 0
      ? 'На конец периода задолженность контрагента перед организацией:'
      : 'На конец периода задолженность организации перед контрагентом:';
  }
}
