// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  isCreditNormalAccount,
  reportAccountNet,
} from './reportAccountNet';

export interface DrillDownRow {
  date: string;
  transactionNumber: string | null;
  referenceNumber: string | null;
  referenceType: string | null;
  contactName: string | null;
  note: string | null;
  debit: number;
  credit: number;
  /** Вклад строки в сумму отчёта — с учётом стороны счёта. */
  amount: number;
  formattedAmount: string;
}

export interface DrillDownResult {
  accountId: number;
  accountName: string;
  fromDate: string;
  toDate: string;
  /** Итог: обязан совпасть с суммой в отчёте до копейки. */
  total: number;
  formattedTotal: string;
  transactions: DrillDownRow[];
  currencyCode: string;
}

/** Сколько строк показываем за раз: длинный список никто не читает целиком. */
export const DRILL_DOWN_LIMIT = 200;

/**
 * Раскрытие суммы отчёта до операций (этап 4 ТЗ, п. 4.2).
 *
 * ТЗ называет это ключевым требованием дословно: «без него пользователь не
 * доверяет цифрам и уходит обратно в Excel». Поэтому здесь важнее всего
 * не список сам по себе, а его ИТОГ: он обязан совпасть с числом, по которому
 * человек щёлкнул.
 *
 * Чтобы совпадал, вклад каждой строки считается тем же правилом, что и в
 * отчётах: у счетов с нормальной стороной «кредит» (доходы, обязательства)
 * это кредит минус дебет, у остальных — наоборот. Складывать «как есть»
 * нельзя: половина строк уйдёт с обратным знаком, и итог разойдётся с
 * отчётом, оставив человека в уверенности, что врут обе цифры.
 */
@Injectable()
export class GetReportDrillDownService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  public async getDrillDown(
    accountId: number,
    fromDate: string,
    toDate: string,
  ): Promise<DrillDownResult> {
    const account: any = await this.accountModel()
      .query()
      .findById(accountId);

    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency ?? 'RUB';

    const rows: any[] = await this.transactionModel()
      .query()
      .where('accountId', accountId)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .withGraphFetched('contact')
      .orderBy('date', 'desc')
      .limit(DRILL_DOWN_LIMIT);

    const isCreditNormal = isCreditNormalAccount(account);

    const transactions = rows.map((row) => {
      const debit = Number(row.debit ?? 0);
      const credit = Number(row.credit ?? 0);
      const amount = reportAccountNet(debit, credit, isCreditNormal);

      return {
        date: row.date,
        transactionNumber: row.transactionNumber ?? null,
        referenceNumber: row.referenceNumber ?? null,
        referenceType: row.referenceType ?? null,
        contactName: row.contact?.displayName ?? null,
        note: row.note ?? null,
        debit,
        credit,
        amount,
        formattedAmount: this.format(amount, currencyCode),
      };
    });

    const total = transactions.reduce((sum, row) => sum + row.amount, 0);

    return {
      accountId,
      accountName: account.name,
      fromDate,
      toDate,
      total,
      formattedTotal: this.format(total, currencyCode),
      transactions,
      currencyCode,
    };
  }

  private format(amount: number, currencyCode: string): string {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}
