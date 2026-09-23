// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import * as moment from 'moment';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { ExchangeRatesService } from '@/modules/ExchangeRates/ExchangeRates.service';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { readOrganizationCalendar } from '@/modules/Settings/organizationCalendar';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { CASH_ACCOUNT_TYPES } from '../constants';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { ForecastGranularity } from '../utils/aggregateForecast';
import { buildCalendarMatrix, matrixPeriods, MatrixMovement } from '../utils/buildCalendarMatrix';
import { expandRecurrence } from '../utils/expandRecurrence';

export const MATRIX_GROUPINGS = ['articles', 'contacts', 'projects'] as const;
export type MatrixGrouping = (typeof MATRIX_GROUPINGS)[number];

export interface CalendarMatrixQuery {
  fromDate: string;
  toDate: string;
  granularity: ForecastGranularity;
  groupBy: MatrixGrouping;
  accountId?: number;
}

/** Не больше стольких колонок: матрица по дням за годы нечитаема и тяжела. */
export const MATRIX_MAX_COLUMNS = 62;

/**
 * Платёжный календарь как матрица «план / факт» (FT-050 ТЗ-3).
 *
 * ФАКТ — проводки денежных счетов (они уже в базовой валюте). Переводы между
 * своими счетами в общей картине не показываются: деньги не пришли и не
 * ушли. С отбором по счёту — показываются: для счёта это настоящее движение.
 *
 * ПЛАН — плановые операции, кроме отменённых: и исполненные тоже, иначе
 * прошлая колонка сравнивала бы факт с пустотой. Повторы разворачиваются.
 * Счета и документы, которые ждут оплаты, — это прогноз, а не план: их
 * показывает обычный календарь.
 */
@Injectable()
export class GetCalendarMatrixService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(AccountTransaction.name)
    private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,
    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
    private readonly tenancyContext: TenancyContext,
    private readonly exchangeRates: ExchangeRatesService,
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,
  ) {}

  public async matrix(tenantId: number, query: CalendarMatrixQuery) {
    const calendar = readOrganizationCalendar(await this.settingsStore());
    const periods = matrixPeriods(query.fromDate, query.toDate, query.granularity, calendar.weekStartDay);
    if (periods.length > MATRIX_MAX_COLUMNS) {
      throw new ServiceError(
        'CALENDAR_MATRIX_TOO_WIDE',
        `Слишком много колонок (${periods.length}): выберите масштаб крупнее или период короче`,
        { columns: periods.length, max: MATRIX_MAX_COLUMNS },
        HttpStatus.BAD_REQUEST,
      );
    }
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const baseCurrency = metadata?.baseCurrency;

    const cashAccounts: any[] = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[])
      .onBuild((q) => {
        if (query.accountId) q.where('id', query.accountId);
      });
    const cashIds = cashAccounts.map((account) => Number(account.id));
    const allCashIds = (
      await this.accountModel().query().whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[])
    ).map((account: any) => Number(account.id));

    const openingByAccount = new Map<number, number>();
    for (const id of cashIds) openingByAccount.set(id, 0);
    if (cashIds.length) {
      const rows: any[] = await this.ledgerModel()
        .query()
        .whereIn('accountId', cashIds)
        .where('date', '<', query.fromDate)
        .groupBy('accountId')
        .select('accountId')
        .sum('debit as debit')
        .sum('credit as credit');
      rows.forEach((row) =>
        openingByAccount.set(Number(row.accountId), Number(row.debit ?? 0) - Number(row.credit ?? 0)),
      );
    }

    const fact = cashIds.length ? await this.factMovements(query, cashIds, allCashIds) : [];
    const plan = await this.planMovements(tenantId, baseCurrency, query);
    const matrix = buildCalendarMatrix({ periods, openingByAccount, plan, fact });
    const names = await this.groupNames(query.groupBy, [
      ...matrix.inflowGroups.map((row) => row.key),
      ...matrix.outflowGroups.map((row) => row.key),
    ]);
    const accountNames = new Map(cashAccounts.map((account) => [Number(account.id), account.name]));

    return {
      baseCurrency,
      granularity: query.granularity,
      groupBy: query.groupBy,
      columns: matrix.columns,
      inflowGroups: matrix.inflowGroups.map((row) => ({ ...row, name: row.key ? names.get(row.key) ?? null : null })),
      outflowGroups: matrix.outflowGroups.map((row) => ({ ...row, name: row.key ? names.get(row.key) ?? null : null })),
      accounts: matrix.accounts.map((row) => ({ ...row, name: accountNames.get(row.accountId) ?? '' })),
    };
  }

  /**
   * Движения денег по документам: денежные ноги дают сумму и счёт, прочие
   * ноги — группу (статью, контрагента, направление). На денежной ноге
   * направления и контрагента на живых данных нет — они на встречной.
   */
  private async factMovements(query: CalendarMatrixQuery, cashIds: number[], allCashIds: number[]) {
    const cashLegs: any[] = await this.ledgerModel()
      .query()
      .whereIn('accountId', cashIds)
      .where('date', '>=', query.fromDate)
      .where('date', '<=', query.toDate)
      .select('referenceType', 'referenceId', 'accountId', 'date', 'debit', 'credit');
    if (cashLegs.length === 0) return [];
    const refs = [...new Map(cashLegs.map((leg) => [`${leg.referenceType}:${leg.referenceId}`, [leg.referenceType, leg.referenceId]])).values()];
    const allLegs: any[] = await this.ledgerModel()
      .query()
      .whereIn(['referenceType', 'referenceId'], refs as any)
      .select('referenceType', 'referenceId', 'accountId', 'contactId', 'projectId');
    const articleOf = await this.articleOfAccount();
    const otherLegsOf = new Map<string, any[]>();
    allLegs
      .filter((leg) => !allCashIds.includes(Number(leg.accountId)))
      .forEach((leg) => {
        const key = `${leg.referenceType}:${leg.referenceId}`;
        otherLegsOf.set(key, [...(otherLegsOf.get(key) ?? []), leg]);
      });
    const contactOf = new Map<string, number>();
    allLegs.forEach((leg) => {
      const key = `${leg.referenceType}:${leg.referenceId}`;
      if (leg.contactId && !contactOf.has(key)) contactOf.set(key, Number(leg.contactId));
    });

    const movements: MatrixMovement[] = [];
    for (const leg of cashLegs) {
      const key = `${leg.referenceType}:${leg.referenceId}`;
      const others = otherLegsOf.get(key) ?? [];
      // Перевод между своими счетами: в общей картине денег не прибавил.
      if (others.length === 0 && !query.accountId) continue;
      const first = others[0];
      const groupKey =
        others.length === 0
          ? 'transfer'
          : query.groupBy === 'articles'
            ? articleOf.get(Number(first.accountId)) ?? null
            : query.groupBy === 'contacts'
              ? contactOf.get(key) ?? null
              : others.find((other) => other.projectId)?.projectId ?? null;
      movements.push({
        date: moment(leg.date).format('YYYY-MM-DD'),
        amount: Number(leg.debit ?? 0) - Number(leg.credit ?? 0),
        groupKey: groupKey === null ? null : String(groupKey),
        accountId: Number(leg.accountId),
      });
    }
    return movements;
  }

  private async planMovements(tenantId: number, baseCurrency: string, query: CalendarMatrixQuery) {
    const operations: any[] = await this.operationModel()
      .query()
      .whereNot('status', 'cancelled')
      .where('plannedDate', '<=', query.toDate)
      .onBuild((q) => {
        if (query.accountId) q.where('accountId', query.accountId);
      });
    const movements: MatrixMovement[] = [];
    for (const op of operations) {
      const anchor = moment(op.plannedDate).format('YYYY-MM-DD');
      const dates: string[] = op.recurrence
        ? expandRecurrence(op.recurrence, anchor, query.fromDate, query.toDate)
        : anchor >= query.fromDate && anchor <= query.toDate
          ? [anchor]
          : [];
      if (dates.length === 0) continue;
      const amount = await this.toBase(tenantId, Number(op.amount), op.currencyCode, baseCurrency);
      const groupKey =
        query.groupBy === 'articles' ? op.articleId : query.groupBy === 'contacts' ? op.contactId : op.projectId;
      dates.forEach((date) =>
        movements.push({
          date,
          amount: op.direction === 'inflow' ? amount : -amount,
          groupKey: groupKey ? String(groupKey) : null,
          accountId: op.accountId ? Number(op.accountId) : null,
        }),
      );
    }
    return movements;
  }

  /** Счёт → статья: первая по номеру счёта, как в проводках частей. */
  private async articleOfAccount(): Promise<Map<number, number>> {
    const links: any[] = await this.articleAccountModel().query().orderBy('accountId', 'asc');
    const map = new Map<number, number>();
    links.forEach((link) => {
      if (!map.has(Number(link.accountId))) map.set(Number(link.accountId), Number(link.articleId));
    });
    return map;
  }

  private async groupNames(groupBy: MatrixGrouping, keys: Array<string | null>): Promise<Map<string, string>> {
    const ids = [...new Set(keys.filter((key): key is string => !!key && key !== 'transfer').map(Number))];
    const names = new Map<string, string>([['transfer', 'transfer']]);
    if (ids.length === 0) return names;
    if (groupBy === 'articles') {
      (await this.articleModel().query().whereIn('id', ids)).forEach((row: any) => names.set(String(row.id), row.name));
    } else if (groupBy === 'contacts') {
      (await this.contactModel().query().whereIn('id', ids)).forEach((row: any) =>
        names.set(String(row.id), row.displayName ?? row.companyName ?? ''),
      );
    } else {
      (await this.dealModel().query().whereIn('id', ids)).forEach((row: any) => names.set(String(row.id), row.name));
    }
    return names;
  }

  private async toBase(tenantId: number, amount: number, fromCurrency: string, baseCurrency: string) {
    if (!fromCurrency || fromCurrency === baseCurrency) return amount;
    const { exchangeRate } = await this.exchangeRates.latest(tenantId, {
      fromCurrency,
      toCurrency: baseCurrency,
    } as any);
    return Math.round(amount * Number(exchangeRate) * 1000) / 1000;
  }
}
