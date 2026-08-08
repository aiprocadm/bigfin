import { Inject, Injectable } from '@nestjs/common';
import { computeVatSummary, VatSummary } from './computeVatSummary';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import {
  ACCOUNT_TYPE,
  TaxReceivableAccount,
} from '@/modules/Accounts/Accounts.constants';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

const TAX_RECEIVABLE_SLUG = TaxReceivableAccount.slug;

/**
 * Собирает сводку по НДС (㉖) за период из движений ГЛ:
 * начисленный налог — кредит счёта «Налоги к уплате» (пассив),
 * налог к вычету — дебет счёта «НДС к вычету» (актив).
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
  ) {}

  /**
   * @param {string} fromDate
   * @param {string} toDate
   */
  public async getSummary(
    fromDate: string,
    toDate: string,
  ): Promise<VatSummary> {
    // Начисленный НДС живёт на пассивном счёте «Налоги к уплате», а входящий
    // (к вычету) — на отдельном активном счёте «НДС к вычету». Раньше модуль
    // читал только первый и считал вычетом ЛЮБОЙ его дебет, включая уплату
    // налога в бюджет: вычет всегда был нулём, а «к уплате» — завышен.
    const taxAccounts = await this.accountModel()
      .query()
      .where('accountType', ACCOUNT_TYPE.TAX_PAYABLE)
      .orWhere('slug', TAX_RECEIVABLE_SLUG);

    if (!taxAccounts.length) return computeVatSummary([]);

    const receivableIds = new Set(
      taxAccounts
        .filter((a: any) => a.slug === TAX_RECEIVABLE_SLUG)
        .map((a: any) => a.id),
    );

    const ids = taxAccounts.map((a: any) => a.id);
    const nameById = new Map<number, string>(
      taxAccounts.map((a: any) => [a.id, a.name]),
    );

    const sums = await this.accountTransactionModel()
      .query()
      .whereIn('accountId', ids)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      // Только строки, порождённые документами со ставкой налога. Уплата
      // налога в бюджет и прочие движения по налоговому счёту ставки не
      // несут — и в сводку по НДС попадать не должны.
      .whereNotNull('taxRateId')
      .groupBy('accountId')
      .select('accountId')
      .sum('credit as credit')
      .sum('debit as debit');

    const rows = (sums as any[]).map((s) => {
      const isReceivable = receivableIds.has(s.accountId);
      const credit = Number(s.credit) || 0;
      const debit = Number(s.debit) || 0;

      return {
        accountId: s.accountId,
        accountName: nameById.get(s.accountId) ?? '',
        // Считаем НЕТТО по каждому счёту:
        // «Налоги к уплате» — начислено продажами (кредит) минус возвраты
        // покупателям (дебет кредит-ноты);
        // «НДС к вычету» — принято по закупкам (дебет) минус возвраты
        // поставщикам (кредит).
        // Уплата налога в бюджет сюда не попадает (у неё нет ставки).
        credit: isReceivable ? 0 : Math.max(credit - debit, 0),
        debit: isReceivable ? Math.max(debit - credit, 0) : 0,
      };
    });

    return computeVatSummary(rows);
  }
}
