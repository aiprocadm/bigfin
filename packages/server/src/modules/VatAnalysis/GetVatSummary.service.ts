import { Inject, Injectable } from '@nestjs/common';
import { computeVatSummary, VatSummary } from './computeVatSummary';
import {
  computeVatByRate,
  VatBucket,
  VatRateInfo,
  VatRateLedgerRow,
} from './computeVatByRate';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TaxRateModel } from '@/modules/TaxRates/models/TaxRate.model';
import {
  ACCOUNT_TYPE,
  TaxReceivableAccount,
} from '@/modules/Accounts/Accounts.constants';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

const TAX_RECEIVABLE_SLUG = TaxReceivableAccount.slug;
const INCOME_ROOT_TYPE = 'income';

/**
 * Собирает сводку по НДС (㉖) за период из движений ГЛ:
 * начисленный налог — кредит счёта «Налоги к уплате» (пассив),
 * налог к вычету — дебет счёта «НДС к вычету» (актив),
 * плюс разбивка по ставкам вместе с налоговой базой (шаг Д5 карты v6).
 */
@Injectable()
export class GetVatSummaryService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
    @Inject(TaxRateModel.name)
    private readonly taxRateModel: TenantModelProxy<typeof TaxRateModel>,
  ) {}

  /**
   * @param {string} fromDate
   * @param {string} toDate
   */
  public async getSummary(
    fromDate: string,
    toDate: string,
  ): Promise<VatSummary> {
    const accounts = await this.accountModel().query();

    if (!accounts.length) return computeVatSummary([]);

    // Каждому счёту — своё место в сводке. Налоговые счета дают сам налог,
    // счета доходов — налоговую базу продаж, всё остальное (расходы, склад) —
    // базу закупок.
    const bucketByAccount = new Map<number, VatBucket>();
    const nameById = new Map<number, string>();

    accounts.forEach((account: any) => {
      nameById.set(account.id, account.name);

      if (account.accountType === ACCOUNT_TYPE.TAX_PAYABLE) {
        bucketByAccount.set(account.id, 'chargedTax');
      } else if (account.slug === TAX_RECEIVABLE_SLUG) {
        bucketByAccount.set(account.id, 'deductibleTax');
      } else if (account.accountRootType === INCOME_ROOT_TYPE) {
        bucketByAccount.set(account.id, 'salesBase');
      } else {
        bucketByAccount.set(account.id, 'purchaseBase');
      }
    });

    // Берём только строки, порождённые документами со ставкой налога. Уплата
    // налога в бюджет и прочие движения ставки не несут — и в сводку по НДС
    // попадать не должны.
    const sums = await this.accountTransactionModel()
      .query()
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .whereNotNull('taxRateId')
      .groupBy('accountId', 'taxRateId')
      .select('accountId', 'taxRateId')
      .sum('credit as credit')
      .sum('debit as debit');

    const taxRates = await this.taxRateModel().query();
    const rates: VatRateInfo[] = (taxRates as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      rate: Number(r.rate) || 0,
    }));

    const rateRows: VatRateLedgerRow[] = (sums as any[])
      .filter((s) => bucketByAccount.has(s.accountId))
      .map((s) => ({
        taxRateId: s.taxRateId,
        bucket: bucketByAccount.get(s.accountId) as VatBucket,
        credit: Number(s.credit) || 0,
        debit: Number(s.debit) || 0,
      }));

    // Плитки «начислено / к вычету / к уплате» считаются по налоговым счетам:
    // «Налоги к уплате» — начислено продажами (кредит) минус возвраты
    // покупателям (дебет кредит-ноты); «НДС к вычету» — принято по закупкам
    // (дебет) минус возвраты поставщикам (кредит).
    const taxByAccount = new Map<number, { credit: number; debit: number }>();

    (sums as any[]).forEach((s) => {
      const bucket = bucketByAccount.get(s.accountId);
      if (bucket !== 'chargedTax' && bucket !== 'deductibleTax') return;

      const current = taxByAccount.get(s.accountId) ?? { credit: 0, debit: 0 };
      current.credit += Number(s.credit) || 0;
      current.debit += Number(s.debit) || 0;
      taxByAccount.set(s.accountId, current);
    });

    const accountRows = Array.from(taxByAccount.entries()).map(
      ([accountId, { credit, debit }]) => {
        const isReceivable =
          bucketByAccount.get(accountId) === 'deductibleTax';

        return {
          accountId,
          accountName: nameById.get(accountId) ?? '',
          credit: isReceivable ? 0 : Math.max(credit - debit, 0),
          debit: isReceivable ? Math.max(debit - credit, 0) : 0,
        };
      },
    );

    return {
      ...computeVatSummary(accountRows),
      byRate: computeVatByRate(rateRows, rates),
    };
  }
}
