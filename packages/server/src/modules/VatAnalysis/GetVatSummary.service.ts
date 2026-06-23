import { Inject, Injectable } from '@nestjs/common';
import { computeVatSummary, VatSummary } from './computeVatSummary';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ACCOUNT_TYPE } from '@/modules/Accounts/Accounts.constants';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

/**
 * Собирает сводку по НДС (㉖) из движений ГЛ по счетам «НДС к уплате»
 * (`tax-payable`) за период: кредит = начислен с продаж, дебет = к вычету.
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
    const taxAccounts = await this.accountModel()
      .query()
      .where('accountType', ACCOUNT_TYPE.TAX_PAYABLE);

    if (!taxAccounts.length) return computeVatSummary([]);

    const ids = taxAccounts.map((a: any) => a.id);
    const nameById = new Map<number, string>(
      taxAccounts.map((a: any) => [a.id, a.name]),
    );

    const sums = await this.accountTransactionModel()
      .query()
      .whereIn('accountId', ids)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .groupBy('accountId')
      .select('accountId')
      .sum('credit as credit')
      .sum('debit as debit');

    const rows = (sums as any[]).map((s) => ({
      accountId: s.accountId,
      accountName: nameById.get(s.accountId) ?? '',
      credit: Number(s.credit) || 0,
      debit: Number(s.debit) || 0,
    }));

    return computeVatSummary(rows);
  }
}
