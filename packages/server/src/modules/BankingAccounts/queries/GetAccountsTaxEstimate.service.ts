// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TAX_REGIME_ACCOUNT_TYPES } from '@/modules/Accounts/utils/accountTaxRegime';
import { CASH_ACCOUNT_TYPES } from '@/modules/Budgets/constants';
import { filterCashSettledLegs } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheetCashBasis';
import {
  recognizeSettlementLegs,
  settlementDepsFromModels,
} from '@/modules/FinancialStatements/modules/ProfitLossSheet/settlementRecognition';
import { PaymentReceivedEntry } from '@/modules/PaymentReceived/models/PaymentReceivedEntry';
import { BillPaymentEntry } from '@/modules/BillPayments/models/BillPaymentEntry';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  AccountTaxBase,
  estimateTaxByAccounts,
  TaxByAccountsEstimate,
} from './estimateTaxByAccounts';
import { taxBaseByCashAccount } from './taxBaseByCashAccount';

/**
 * Результат оценки по счетам.
 *
 * `applicable: false` — ни у одного денежного счёта режим не выбран. Тогда
 * оценку считает прежний путь (по отчёту о прибылях и ставке организации),
 * и для всех, кто поле не трогал, не меняется ничего — даже способ расчёта.
 */
export type AccountsTaxEstimateResult =
  | { applicable: false }
  | { applicable: true; estimate: TaxByAccountsEstimate | null };

/**
 * Оценка налога за квартал с учётом режимов счетов (FT-070 ТЗ-3).
 */
@Injectable()
export class GetAccountsTaxEstimateService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(PaymentReceivedEntry.name)
    private readonly paymentReceivedEntryModel: TenantModelProxy<
      typeof PaymentReceivedEntry
    >,

    @Inject(BillPaymentEntry.name)
    private readonly billPaymentEntryModel: TenantModelProxy<
      typeof BillPaymentEntry
    >,
  ) {}

  public async estimate(today: string): Promise<AccountsTaxEstimateResult> {
    const accounts: any[] = await this.accountModel().query();

    // Режим учитывается только у денег: у остальных счетов он ничего не
    // значит, даже если попал в базу в обход формы.
    const regimeOf = new Map<number, string>();
    accounts.forEach((account) => {
      if (
        account.taxRegime &&
        TAX_REGIME_ACCOUNT_TYPES.includes(account.accountType)
      ) {
        regimeOf.set(Number(account.id), String(account.taxRegime));
      }
    });
    if (regimeOf.size === 0) return { applicable: false };

    const day = moment(today, 'YYYY-MM-DD', true);
    if (!day.isValid()) return { applicable: true, estimate: null };

    const fromDate = day.clone().startOf('quarter').format('YYYY-MM-DD');
    const toDate = day.clone().endOf('quarter').format('YYYY-MM-DD');

    const cashIds = new Set<number>(
      accounts
        .filter((account) =>
          (CASH_ACCOUNT_TYPES as readonly string[]).includes(account.accountType),
        )
        .map((account) => Number(account.id)),
    );
    const isCashAccount = (id: number) => cashIds.has(Number(id));

    // Те же строки, что у кассового ОПиУ: документы, коснувшиеся денег, и
    // доход с расходом, признанные по факту оплаты счетов.
    const legs: any[] = await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.modify('filterDateRange', fromDate, toDate);
      });
    const settledLegs = filterCashSettledLegs(legs, isCashAccount);
    const recognizedLegs = await recognizeSettlementLegs(
      settledLegs,
      settlementDepsFromModels({
        accounts,
        accountTransactionModel: this.accountTransactionModel,
        paymentReceivedEntryModel: this.paymentReceivedEntryModel,
        billPaymentEntryModel: this.billPaymentEntryModel,
      }),
    );
    const bases = taxBaseByCashAccount({
      settledLegs,
      recognizedLegs,
      accountTypeById: new Map(
        accounts.map((account) => [Number(account.id), account.accountType]),
      ),
      isCashAccount,
    });

    // Счёт с режимом, по которому за квартал ничего не было, всё равно
    // идёт в расчёт с нулём: так в разбивке видно «по этому счёту — ноль».
    regimeOf.forEach((_regime, accountId) => {
      if (!bases.has(accountId)) bases.set(accountId, { income: 0, expenses: 0 });
    });

    const accountBases: AccountTaxBase[] = [...bases.entries()].map(
      ([accountId, base]) => ({
        accountId,
        regime: (regimeOf.get(accountId) as any) ?? null,
        income: base.income,
        expenses: base.expenses,
      }),
    );

    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const orgRegime = metadata?.taxRegime ?? metadata?.tax_regime ?? null;
    const rawRate = metadata?.taxRate ?? metadata?.tax_rate;
    const orgCustomRatePercent =
      rawRate === null || rawRate === undefined || rawRate === ''
        ? null
        : Number(rawRate);

    return {
      applicable: true,
      estimate: estimateTaxByAccounts({
        orgRegime,
        orgCustomRatePercent,
        accounts: accountBases,
        today,
      }),
    };
  }
}
