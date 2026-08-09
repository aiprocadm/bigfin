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
/** Группа, которой все сборщики проводок помечают строку налога. */
const TAX_LINE_INDEX_GROUP = 30;

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

    const nameById = new Map<number, string>();
    const accountById = new Map<number, any>();

    accounts.forEach((account: any) => {
      nameById.set(account.id, account.name);
      accountById.set(account.id, account);
    });

    /**
     * Куда отнести строку журнала. Налоговые строки узнаются по группе 30 —
     * так их помечают все сборщики проводок. Это важно именно для
     * невозмещаемого налога: он лежит на том же счёте, что и сама покупка,
     * и по счёту его от базы не отличить.
     */
    const bucketOf = (accountId: number, indexGroup: number): VatBucket | null => {
      const account = accountById.get(accountId);
      if (!account) return null;

      const isTaxLine = Number(indexGroup) === TAX_LINE_INDEX_GROUP;

      if (isTaxLine) {
        if (account.accountType === ACCOUNT_TYPE.TAX_PAYABLE) return 'chargedTax';
        if (account.slug === TAX_RECEIVABLE_SLUG) return 'deductibleTax';
        // Налоговая строка на счёте покупки — это невозмещаемый налог.
        return 'nonDeductibleTax';
      }
      return account.accountRootType === INCOME_ROOT_TYPE
        ? 'salesBase'
        : 'purchaseBase';
    };

    // Берём только строки, порождённые документами со ставкой налога. Уплата
    // налога в бюджет и прочие движения ставки не несут — и в сводку по НДС
    // попадать не должны.
    const sums = await this.accountTransactionModel()
      .query()
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .whereNotNull('taxRateId')
      .groupBy('accountId', 'taxRateId', 'indexGroup')
      .select('accountId', 'taxRateId', 'indexGroup')
      .sum('credit as credit')
      .sum('debit as debit');

    const taxRates = await this.taxRateModel().query();
    const rates: VatRateInfo[] = (taxRates as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      rate: Number(r.rate) || 0,
    }));

    const bucketed = (sums as any[])
      .map((s) => ({ ...s, bucket: bucketOf(s.accountId, s.indexGroup) }))
      .filter((s) => s.bucket !== null);

    const rateRows: VatRateLedgerRow[] = bucketed.map((s) => ({
      taxRateId: s.taxRateId,
      bucket: s.bucket as VatBucket,
      credit: Number(s.credit) || 0,
      debit: Number(s.debit) || 0,
    }));

    // Плитки «начислено / к вычету / к уплате» считаются по налоговым счетам:
    // «Налоги к уплате» — начислено продажами (кредит) минус возвраты
    // покупателям (дебет кредит-ноты); «НДС к вычету» — принято по закупкам
    // (дебет) минус возвраты поставщикам (кредит). Невозмещаемый налог сюда
    // не попадает: он к уплате не относится, он просто расход.
    const taxByAccount = new Map<number, { credit: number; debit: number }>();

    bucketed.forEach((s) => {
      if (s.bucket !== 'chargedTax' && s.bucket !== 'deductibleTax') return;

      const current = taxByAccount.get(s.accountId) ?? { credit: 0, debit: 0 };
      current.credit += Number(s.credit) || 0;
      current.debit += Number(s.debit) || 0;
      taxByAccount.set(s.accountId, current);
    });

    const receivableAccountIds = new Set(
      bucketed.filter((s) => s.bucket === 'deductibleTax').map((s) => s.accountId),
    );

    const accountRows = Array.from(taxByAccount.entries()).map(
      ([accountId, { credit, debit }]) => {
        const isReceivable = receivableAccountIds.has(accountId);

        return {
          accountId,
          accountName: nameById.get(accountId) ?? '',
          credit: isReceivable ? 0 : Math.max(credit - debit, 0),
          debit: isReceivable ? Math.max(debit - credit, 0) : 0,
        };
      },
    );

    const byRate = computeVatByRate(rateRows, rates);

    return {
      ...computeVatSummary(accountRows),
      byRate,
      nonDeductible: byRate.reduce((sum, r) => sum + r.nonDeductible, 0),
    };
  }
}
