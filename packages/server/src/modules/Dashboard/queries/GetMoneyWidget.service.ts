// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import {
  AccountCashGaps,
  GetAccountsCashGapsService,
} from '@/modules/PaymentCalendar/queries/GetAccountsCashGaps.service';
import { CashGapInterval } from '@/modules/PaymentCalendar/PaymentCalendar.interfaces';
import { formatNumber } from '@/utils/format-number';

import { GetMoneySummaryService } from './GetMoneySummary.service';
import { AccountGroupsService } from '@/modules/BankingAccounts/queries/AccountGroups.service';

export interface MoneyWidgetResponse {
  total: { amount: number; formatted: string; currencyCode: string };
  /** Ближайший разрыв по группе счетов; `null` — разрывов не видно. */
  gap: (CashGapInterval & { formatted: string }) | null;
  /** Остаток по дням за горизонт — для линии тренда в шапке. */
  sparkline: number[];
  accounts: AccountCashGaps[];
  /** Пользовательские группы счетов (FIN-017): вкладка «По группам». */
  groups: Array<{ id: number; name: string; accountsCount: number }>;
  /** Плановые операции без счёта: в разрез по счетам они не попадают. */
  plannedWithoutAccount: number;
  /** Выключенный календарь — это ответ, а не ошибка. */
  calendarEnabled: boolean;
}

/** Сколько дней показывает линия в шапке. Месяц — горизонт владельца. */
const SPARKLINE_DAYS = 30;

/** Сколько живёт ответ. Ручка дёргается на каждом переходе между экранами. */
export const MONEY_WIDGET_TTL_MS = 60_000;

/**
 * Виджет «Деньги» в шапке (FIN-006 ТЗ-2).
 *
 * ЗАЧЕМ. Остаток и предупреждение о разрыве жили только на главной. Уйдя в
 * отчёты или в операции, человек терял из виду главный факт своего дня:
 * сколько денег и когда они кончатся.
 *
 * ОДНА РУЧКА НА ВСЁ. Шапка есть на каждом экране, и три запроса на каждом
 * переходе — это три запроса на каждый щелчок по меню.
 *
 * ПОЧЕМУ ЗДЕСЬ ЕСТЬ КЭШ, ХОТЯ В ПРОДУКТЕ ИХ НЕТ. Это первый осознанный кэш,
 * и он оправдан: ответ одинаков для всех экранов и устаревает медленно
 * (остаток за минуту меняется редко), а дёргают его чаще всего в продукте.
 * Кэш В ПАМЯТИ ПРОЦЕССА, а не в Redis: у кэша на минуту цена промаха —
 * один лишний расчёт, а цена общего хранилища — новая связь, которую надо
 * поднимать, чинить и чистить. Когда приложение поедет в несколько
 * процессов, это место придётся пересмотреть — о чём здесь и написано.
 */
@Injectable()
export class GetMoneyWidgetService {
  private readonly cache = new Map<
    string,
    { at: number; value: MoneyWidgetResponse }
  >();

  constructor(
    private readonly moneySummary: GetMoneySummaryService,
    private readonly forecast: GetPaymentCalendarForecastService,
    private readonly accountsGaps: GetAccountsCashGapsService,
    private readonly accountGroups: AccountGroupsService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  public async getMoneyWidget(): Promise<MoneyWidgetResponse> {
    const tenant: any = await this.tenancyContext.getTenant();
    const key = `money-widget:${tenant?.id ?? 'unknown'}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.at < MONEY_WIDGET_TTL_MS) {
      return cached.value;
    }

    const value = await this.build(tenant);
    this.cache.set(key, { at: Date.now(), value });

    return value;
  }

  /**
   * Группы счетов. Их может не быть вовсе — таблица появилась позже, и на
   * базе без накатанной миграции виджет всё равно обязан открыться.
   */
  private async safeGroups() {
    try {
      const groups: any[] = await this.accountGroups.getGroups();

      return groups.map((group: any) => ({
        id: group.id,
        name: group.name,
        accountsCount: group.accountsCount ?? 0,
      }));
    } catch {
      return [];
    }
  }

  private async build(tenant: any): Promise<MoneyWidgetResponse> {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency ?? 'RUB';

    const summary: any = await this.moneySummary.getMoneySummary();
    const amount = Number(summary?.cashBalance?.amount ?? 0);

    const total = {
      amount,
      formatted:
        summary?.cashBalance?.formattedAmount ??
        formatNumber(amount, { currencyCode, money: true }),
      currencyCode,
    };

    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().add(SPARKLINE_DAYS, 'days').format('YYYY-MM-DD');

    try {
      const forecast: any = await this.forecast.getForecast(tenant?.id, {
        fromDate,
        toDate,
      } as any);

      const gaps: CashGapInterval[] = forecast?.gaps ?? [];
      const nearest = gaps[0] ?? null;
      const perAccount = await this.accountsGaps.getAccountsCashGaps();
      const groups = await this.safeGroups();

      return {
        total,
        gap: nearest
          ? {
              ...nearest,
              formatted: formatNumber(nearest.deepestAmount, {
                currencyCode,
                money: true,
              }),
            }
          : null,
        sparkline: (forecast?.days ?? []).map((day: any) =>
          Number(day.balance ?? 0),
        ),
        accounts: perAccount.accounts,
        groups,
        plannedWithoutAccount: perAccount.plannedWithoutAccount,
        calendarEnabled: true,
      };
    } catch {
      /**
       * Календарь выключен или прогноз не построился.
       *
       * Остаток при этом ИЗВЕСТЕН, и прятать его из-за прогноза нельзя:
       * человек лишится главного числа из-за отключённого модуля. Поэтому
       * отдаём остаток и честно говорим, что прогноза нет.
       */
      return {
        total,
        gap: null,
        sparkline: [],
        accounts: [],
        groups: [],
        plannedWithoutAccount: 0,
        calendarEnabled: false,
      };
    }
  }
}
