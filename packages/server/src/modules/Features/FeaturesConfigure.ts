import { Features } from '@/common/types/Features';
import { IFeatureConfiugration } from '@/common/types/Features';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Модули, включённые по умолчанию для организаций с локацией RU
 * (К1 карты v19, решение 36).
 *
 * Все они уже написаны и покрыты тестами, но по умолчанию были невидимы:
 * из 36 модулей включены два. Целевой пользователь — предприниматель без
 * бухгалтерского образования: он не пойдёт в «Настройки → Модули» искать
 * печатные формы, он решит, что их нет.
 *
 * Сюда НЕ входят модули, бесполезные без внешних ключей (`bank_api_sync`,
 * `marketplaces`): пустой экран вместо возможности — хуже, чем её
 * отсутствие. Не входят и узкие сценарии (зарплата, дивиденды, основные
 * средства, сделки) — их включают осознанно.
 *
 * Список именно список: что получает новая русская организация, должно
 * читаться глазами, а не собираться обходом конфигурации.
 */
export const RU_DEFAULT_FEATURES: string[] = [
  Features.RU_PRINT_FORMS,
  Features.VAT_ANALYSIS,
  Features.BANK_STATEMENT_IMPORT,
  Features.ONEC_IMPORT,
  Features.ONEC_EXPORT,
  Features.PAYMENT_CALENDAR,
  Features.DEBTS,
];

/** Локация организации, для которой действует российский набор. */
export const RU_LOCATION = 'RU';

@Injectable()
export class FeaturesConfigure {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the feature configure.
   * @returns {IFeatureConfiugration[]}
   */

  getConfigure(): IFeatureConfiugration[] {
    return [
      {
        name: Features.BRANCHES,
        defaultValue: false,
      },
      {
        name: Features.WAREHOUSES,
        defaultValue: false,
      },
      {
        name: Features.BankSyncing,
        defaultValue: this.configService.get('bankfeed.enabled') ?? false,
      },
      {
        // Единственный модуль, включённый по умолчанию.
        //
        // Статьи учёта — это справочник, на котором стоят план-факт бюджета и
        // финмодель. Организация получает девять статей уже при создании, но
        // раздел был спрятан за флагом: пользователь включал бюджеты, видел
        // всюду нули и решал, что продукт сломан.
        //
        // Включение ничего не меняет в учёте — это справочник и страница.
        name: Features.MGMT_ARTICLES,
        defaultValue: true,
      },
      {
        name: Features.PAYMENT_CALENDAR,
        defaultValue: false,
      },
      {
        name: Features.BUDGETS,
        defaultValue: false,
      },
      {
        name: Features.CUSTOMERS_LIST_V2,
        defaultValue: false,
      },
      {
        name: Features.VENDORS_LIST_V2,
        defaultValue: false,
      },
      {
        name: Features.DEBTS,
        defaultValue: false,
      },
      {
        name: Features.PAYMENT_REQUESTS,
        defaultValue: false,
      },
      {
        name: Features.DEALS,
        defaultValue: false,
      },
      {
        name: Features.COST_ALLOCATION,
        defaultValue: false,
      },
      {
        name: Features.DEAL_STAGES,
        defaultValue: false,
      },
      {
        name: Features.PAYROLL,
        defaultValue: false,
      },
      {
        name: Features.PAYROLL_KPI,
        defaultValue: false,
      },
      {
        name: Features.DATA_QUALITY,
        defaultValue: false,
      },
      {
        name: Features.DIVIDENDS,
        defaultValue: false,
      },
      {
        name: Features.ACCRUAL_PNL,
        defaultValue: false,
      },
      {
        name: Features.CREDITS,
        defaultValue: false,
      },
      {
        name: Features.FIXED_ASSETS,
        defaultValue: false,
      },
      {
        // Включено по умолчанию (Г1 карты v20).
        //
        // Продукт умеет предупреждать: счёт просрочен, на счёте кончаются
        // деньги, впереди кассовый разрыв. Всё это молчало — модуль был
        // выключен, и предприниматель без бухгалтера узнавал о просрочке,
        // только если сам заходил и смотрел.
        //
        // Включать безопасно: письмо и телеграм уходят ЛИШЬ через
        // настроенный канал, а адрес получателя по умолчанию пуст.
        // Заработает лента в приложении — та, ради которой модуль и писали.
        name: Features.NOTIFICATIONS,
        defaultValue: true,
      },
      {
        // Вопрос 16 карты v14: мастер настройки спрашивал режим, а ответ
        // игнорировался — фича была выключена. Организации без выбранного
        // режима получают «Бизнес» (упрощённый); вернуть бухгалтерские
        // экраны можно в «Настройки → Режим интерфейса».
        name: Features.INTERFACE_MODES,
        defaultValue: true,
      },
      {
        name: Features.FINANCIAL_MODEL,
        defaultValue: false,
      },
      {
        name: Features.BANK_STATEMENT_IMPORT,
        defaultValue: false,
      },
      {
        name: Features.ZENMONEY_IMPORT,
        defaultValue: false,
      },
      {
        name: Features.BANK_API_SYNC,
        defaultValue: false,
      },
      {
        name: Features.ACQUIRING,
        defaultValue: false,
      },
      {
        name: Features.ONEC_EXPORT,
        defaultValue: false,
      },
      {
        name: Features.TELEGRAM_QUICK_ENTRY,
        defaultValue: false,
      },
      {
        name: Features.ONEC_IMPORT,
        defaultValue: false,
      },
      {
        name: Features.CRM_INTEGRATION,
        defaultValue: false,
      },
      {
        name: Features.MARKETPLACES,
        defaultValue: false,
      },
      {
        name: Features.MOYSKLAD,
        defaultValue: false,
      },
      {
        name: Features.VAT_ANALYSIS,
        defaultValue: false,
      },
      {
        name: Features.RU_PRINT_FORMS,
        defaultValue: false,
      },
      {
        name: Features.FINANCIAL_RATIOS,
        defaultValue: false,
      },
    ];
  }
}
