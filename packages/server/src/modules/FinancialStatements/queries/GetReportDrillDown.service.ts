// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatNumber } from '@/utils/format-number';
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
  /**
   * Остаток на начало периода — всё, что накопилось ДО первого дня.
   *
   * Нужен Балансу и Движению денег. Их строка — не оборот за период, а
   * ОСТАТОК на дату, и сумма операций периода с ним никогда не сойдётся.
   * Сходится другое равенство: остаток на начало + оборот = остаток на конец.
   */
  openingBalance: number;
  formattedOpeningBalance: string;
  /** Остаток на конец: начало плюс оборот. Именно он стоит в Балансе. */
  closingBalance: number;
  formattedClosingBalance: string;
  /** Сколько операций в периоде всего — список может быть обрезан. */
  transactionsCount: number;
  /** Список показан не целиком. */
  isTruncated: boolean;
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

    // ИТОГ СЧИТАЕТСЯ ОТДЕЛЬНЫМ ЗАПРОСОМ, А НЕ ПО ПОКАЗАННЫМ СТРОКАМ.
    // Список обрезан до 200 операций; сложив только их, мы показали бы
    // человеку итог меньше, чем в отчёте, — ровно то недоверие к цифрам,
    // ради устранения которого раскрытие и делалось.
    const total = await this.netOverPeriod(
      accountId,
      fromDate,
      toDate,
      isCreditNormal,
    );

    // Остаток на начало: всё, что накоплено ДО первого дня периода.
    // Границы нет — у остатка нет «начала времён», он считается от самой
    // первой проводки счёта.
    const openingBalance = await this.netOverPeriod(
      accountId,
      null,
      this.dayBefore(fromDate),
      isCreditNormal,
    );

    const closingBalance = openingBalance + total;
    const transactionsCount = await this.countOverPeriod(
      accountId,
      fromDate,
      toDate,
    );

    return {
      accountId,
      accountName: account.name,
      fromDate,
      toDate,
      total,
      formattedTotal: this.format(total, currencyCode),
      openingBalance,
      formattedOpeningBalance: this.format(openingBalance, currencyCode),
      closingBalance,
      formattedClosingBalance: this.format(closingBalance, currencyCode),
      transactionsCount,
      isTruncated: transactionsCount > transactions.length,
      transactions,
      currencyCode,
    };
  }

  /**
   * Чистый оборот счёта за отрезок — одним запросом к базе.
   *
   * `from = null` означает «с самой первой проводки»: у остатка на начало
   * нижней границы нет.
   */
  private async netOverPeriod(
    accountId: number,
    from: string | null,
    to: string,
    isCreditNormal: boolean,
  ): Promise<number> {
    const query = this.transactionModel()
      .query()
      .where('accountId', accountId)
      .where('date', '<=', to);

    if (from !== null) {
      query.where('date', '>=', from);
    }
    const row: any = await query
      .sum('debit as debit')
      .sum('credit as credit')
      .first();

    return reportAccountNet(
      Number(row?.debit ?? 0),
      Number(row?.credit ?? 0),
      isCreditNormal,
    );
  }

  /** Сколько операций в периоде — чтобы честно сказать, что список обрезан. */
  private async countOverPeriod(
    accountId: number,
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    const row: any = await this.transactionModel()
      .query()
      .where('accountId', accountId)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .count('id as total')
      .first();

    return Number(row?.total ?? 0);
  }

  /**
   * День перед началом периода.
   *
   * Остаток на начало — это состояние на КОНЕЦ предыдущего дня. Взять сам
   * `fromDate` нельзя: операции первого дня попали бы и в остаток, и в
   * оборот, и равенство «начало + оборот = конец» разошлось бы ровно на них.
   */
  private dayBefore(date: string): string {
    const value = new Date(`${date}T00:00:00Z`);

    value.setUTCDate(value.getUTCDate() - 1);

    return value.toISOString().slice(0, 10);
  }

  /**
   * Сумма для показа человеку — через ОБЩИЙ помощник (§5.2 ТЗ).
   *
   * Здесь стоял самодельный формат «число плюс код валюты»: раскрытие
   * показывало «1140000.00 RUB» там, где сам отчёт показывает
   * «1 140 000,00 ₽». Одна и та же сумма выглядела по-разному на экране и в
   * раскрытии — это прямо то, от чего человек перестаёт верить цифрам.
   */
  private format(amount: number, currencyCode: string): string {
    return formatNumber(amount, { currencyCode, money: true });
  }
}
