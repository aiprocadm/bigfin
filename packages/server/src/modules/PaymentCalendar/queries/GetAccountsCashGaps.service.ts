// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { CASH_ACCOUNT_TYPES } from '../constants';
import { CashGapInterval } from '../PaymentCalendar.interfaces';
import { GetPaymentCalendarForecastService } from './GetPaymentCalendarForecast.service';
import { PlannedOperation } from '../models/PlannedOperation.model';

export interface AccountCashGaps {
  accountId: number;
  accountName: string;
  /** Пользовательская группа счёта; `null` — «Нераспределённые». */
  accountGroupId: number | null;
  /** Остаток на конец горизонта — то, чем счёт закончит период. */
  balance: number;
  gaps: CashGapInterval[];
  /** Прогноз не построен: строка честно скажет об этом человеку. */
  forecastFailed: boolean;
}

export interface AccountsCashGapsResult {
  horizonDays: number;
  accounts: AccountCashGaps[];
  /**
   * Плановые операции без указанного счёта.
   *
   * Они есть в совокупном прогнозе, но в разрез по счетам попасть не могут:
   * неизвестно, с какого счёта уйдут деньги. Молчать об этом нельзя —
   * человек сверит разрезы с общим итогом и не сойдётся.
   */
  plannedWithoutAccount: number;
}

/** Горизонт по умолчанию: квартал вперёд — столько живёт денежный план. */
export const DEFAULT_GAP_HORIZON_DAYS = 90;

/**
 * Кассовый разрыв ПО КАЖДОМУ СЧЁТУ (FIN-007 ТЗ-2).
 *
 * ЗАЧЕМ. Совокупный разрыв отвечает «денег не хватит», но не говорит, где
 * именно. У владельца пять счетов, и деньги между ними не переезжают
 * мгновенно: увидев «Т-Банк — разрыв с 15.10 по 16.10», он за день перекинет
 * деньги с другого счёта. Увидев «разрыв 15 октября», он узнает о проблеме
 * постфактум.
 *
 * ГЛУБИНА ВАЖНЕЕ ФАКТА. Отдаётся не только «разрыв есть», но и сколько
 * именно не хватит в худший день: это и есть число, на которое надо
 * пополнить счёт.
 */
@Injectable()
export class GetAccountsCashGapsService {
  constructor(
    private readonly forecast: GetPaymentCalendarForecastService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<
      typeof PlannedOperation
    >,
  ) {}

  public async getAccountsCashGaps(
    horizonDays: number = DEFAULT_GAP_HORIZON_DAYS,
  ): Promise<AccountsCashGapsResult> {
    const horizon = this.normalizeHorizon(horizonDays);
    const tenant: any = await this.tenancyContext.getTenant();
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().add(horizon, 'days').format('YYYY-MM-DD');

    const cashAccounts: any[] = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);

    const accounts: AccountCashGaps[] = [];

    for (const account of cashAccounts) {
      try {
        const forecast: any = await this.forecast.getForecast(tenant?.id, {
          fromDate,
          toDate,
          accountId: account.id,
        } as any);

        const days = forecast?.days ?? [];

        accounts.push({
          accountId: account.id,
          accountName: account.name,
          accountGroupId: account.accountGroupId ?? null,
          balance: Number(
            days.length > 0
              ? days[days.length - 1].balance
              : (forecast?.openingBalance ?? 0),
          ),
          gaps: forecast?.gaps ?? [],
          forecastFailed: false,
        });
      } catch {
        // Не построился прогноз по одному счёту — остальные всё равно
        // показываем. Молча выбросить счёт хуже: человек решит, что счёта
        // нет, а он есть и, возможно, именно на нём беда.
        accounts.push({
          accountId: account.id,
          accountName: account.name,
          accountGroupId: account.accountGroupId ?? null,
          balance: 0,
          gaps: [],
          forecastFailed: true,
        });
      }
    }

    return {
      horizonDays: horizon,
      accounts,
      plannedWithoutAccount: await this.countPlannedWithoutAccount(
        fromDate,
        toDate,
      ),
    };
  }

  /**
   * Горизонт зажимается в разумные рамки.
   *
   * Меньше недели прогноз бессмыслен, больше года — это уже не прогноз, а
   * фантазия: плановые операции так далеко никто не заводит.
   */
  private normalizeHorizon(value: number): number {
    const days = Number(value);

    if (!Number.isFinite(days)) return DEFAULT_GAP_HORIZON_DAYS;

    return Math.min(365, Math.max(7, Math.trunc(days)));
  }

  private async countPlannedWithoutAccount(
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    try {
      return await this.plannedOperationModel()
        .query()
        .whereNull('accountId')
        .where('plannedDate', '>=', fromDate)
        .where('plannedDate', '<=', toDate)
        .resultSize();
    } catch {
      return 0;
    }
  }
}
