// © 2026 Bigfin
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';

import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { DisplayPreferencesService } from '@/modules/Settings/queries/DisplayPreferences.service';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { BankApiSyncSettingsService } from '@/modules/BankApiSync/BankApiSyncSettings.service';

import {
  buildOnboardingStatus,
  OnboardingSignals,
  OnboardingStatus,
} from './onboardingSteps';

/** Виды денежных счетов — те, что видны на экране «Счета». */
const MONEY_ACCOUNT_TYPES = ['bank', 'cash', 'credit-card'];

type Count = (knex: Knex) => Knex.QueryBuilder;

/**
 * Статус онбординга для счётчика в шапке (FT-095 ТЗ-3).
 *
 * ОДНА РУЧКА ВМЕСТО ВОСЬМИ СПИСКОВ. Шапка есть на каждом экране, и восемь
 * запросов списков на каждом переходе — это восемь запросов на каждый
 * щелчок. Кроме того, половину нужных чисел витрина не может получить без
 * прав, которых у неё может не быть. Здесь — восемь коротких `COUNT`.
 */
@Injectable()
export class GetOnboardingStatusService {
  private readonly logger = new Logger(GetOnboardingStatusService.name);

  constructor(
    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,

    private readonly displayPreferences: DisplayPreferencesService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  public async getStatus(): Promise<OnboardingStatus> {
    const user: any = await this.tenancyContext.getSystemUser();
    const prefs = await this.displayPreferences.getPreferences(user?.id);
    const knex = this.tenantKnex();

    const [
      userMoneyAccounts,
      batches,
      uncategorized,
      ownArticles,
      mappedArticles,
      bankRules,
      plaidItems,
      apiBanks,
      teamMembers,
      plannedOperations,
    ] = await Promise.all([
      // Счёт из сида (у новой организации их несколько, среди них и
      // «Сберегательный» без пометки «системный») человек не заводил.
      // Поэтому мерим отметкой сида, а не пометкой `predefined`.
      this.count(knex, 'userMoneyAccounts', (k) =>
        k('accounts')
          .whereIn('account_type', MONEY_ACCOUNT_TYPES)
          .whereNull('seeded_at'),
      ),
      // Откаченный импорт выпиской не считается: человек сам сказал, что
      // этот файл был ошибкой.
      this.count(knex, 'importBatches', (k) =>
        k('import_batches').whereNull('rolled_back_at'),
      ),
      // Старые импорты (до пакетов) и строки из банка оставили только
      // строки «Разбора» — их тоже считаем.
      this.count(knex, 'uncategorized', (k) =>
        k('uncategorized_cashflow_transactions'),
      ),
      // Статья без ключа сида заведена человеком.
      this.count(knex, 'ownArticles', (k) =>
        k('management_articles').whereNull('seed_key'),
      ),
      // Сид привязок счетов к статьям не пишет: любая привязка — работа
      // человека над статьями.
      this.count(knex, 'mappedArticles', (k) =>
        k('management_article_accounts'),
      ),
      this.count(knex, 'bankRules', (k) => k('bank_rules')),
      this.count(knex, 'plaidItems', (k) => k('plaid_items')),
      this.countApiBanks(),
      this.count(knex, 'teamMembers', (k) => k('users')),
      this.count(knex, 'plannedOperations', (k) => k('planned_operations')),
    ]);

    const signals: OnboardingSignals = {
      userMoneyAccounts,
      statementRows: batches + uncategorized,
      customizedArticles: ownArticles + mappedArticles,
      bankRules,
      connectedBanks: plaidItems + apiBanks,
      teamMembers,
      plannedOperations,
      reportBuilt: prefs.onboardingReportBuilt === true,
    };

    return buildOnboardingStatus(signals, prefs.onboardingSkipped);
  }

  /**
   * Банки, подключённые по API. Тот же разбор учётных данных, что у самого
   * модуля банков: иначе шапка и экран «Банки» могли бы спорить, подключён
   * ли банк. Служба создаётся здесь, а не приходит из модуля банков: ей
   * нужно только хранилище настроек, а подключать ради одного чтения весь
   * модуль с его зависимостями — лишний риск не поднять сервер.
   */
  private async countApiBanks(): Promise<number> {
    try {
      const connected = await new BankApiSyncSettingsService(
        this.settingsStore,
      ).listConnected();
      return Object.values(connected).filter(Boolean).length;
    } catch (error) {
      this.logger.warn(`onboarding: bank api status failed: ${error}`);
      return 0;
    }
  }

  /**
   * Одно число. Сбой одного запроса (например, таблицы ещё нет на базе,
   * куда не докатилась миграция) делает шаг несделанным, а не роняет шапку:
   * подсказка «с чего начать» не стоит того, чтобы человек не мог работать.
   */
  private async count(knex: Knex, name: string, query: Count): Promise<number> {
    try {
      const row: any = await query(knex).count('* as total').first();
      const value = row ? Object.values(row)[0] : 0;
      return Number(value) || 0;
    } catch (error) {
      this.logger.warn(`onboarding: count ${name} failed: ${error}`);
      return 0;
    }
  }
}
