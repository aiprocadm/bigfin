// © 2026 Bigfin
import { Features } from '@/common/types/Features';

/**
 * Пользовательские продуктовые модули, переключаемые на странице Настройки → Модули.
 * Технические/под-флаги (customers_list_v2, vendors_list_v2, interface_modes,
 * BankSyncing) намеренно НЕ включены — их переключение пользователем может
 * сломать экран.
 *
 * Список ОБЯЗАН совпадать с перечнем на странице «Модули» (webapp
 * ModulesPage) — их сверяет `moduleListParity.spec.ts`. Два независимых
 * ручных списка уже расходились: готовые модули оставались без тумблера, и
 * включить их можно было только прямым вызовом API или SQL.
 */
export const MODULE_ALLOWLIST: string[] = [
  // Планирование
  Features.PAYMENT_CALENDAR, Features.BUDGETS, Features.FINANCIAL_MODEL,
  // Учёт и аналитика
  Features.MGMT_ARTICLES, Features.DEALS, Features.COST_ALLOCATION, Features.DEBTS,
  Features.PAYMENT_REQUESTS, Features.DIVIDENDS, Features.CREDITS, Features.FIXED_ASSETS,
  // Вкладка «KPI» внутри «Зарплаты»: показывает планы и премии. Отдельного
  // способа её включить не было вовсе.
  Features.PAYROLL, Features.PAYROLL_KPI,
  Features.VAT_ANALYSIS, Features.FINANCIAL_RATIOS, Features.DATA_QUALITY,
  // Тумблер кассового метода в ОПиУ: включение лишь показывает селектор в
  // настройках отчёта, ничего не ломает — а другого способа включить его нет.
  Features.RU_PRINT_FORMS, Features.ACCRUAL_PNL,
  // Поэтапное признание выручки по сделке: включение лишь показывает секцию
  // «Этапы» внутри карточки сделки, ничего не ломает — а иначе владельцу
  // нечем его включить, кроме прямого SQL.
  Features.DEAL_STAGES,
  // Интеграции
  Features.BANK_API_SYNC, Features.BANK_STATEMENT_IMPORT,
  Features.ACQUIRING, Features.ZENMONEY_IMPORT, Features.ONEC_EXPORT, Features.TELEGRAM_QUICK_ENTRY, Features.ONEC_IMPORT,
  Features.MOYSKLAD, Features.MARKETPLACES, Features.CRM_INTEGRATION,
  // Структура
  Features.BRANCHES, Features.WAREHOUSES,
  // Прочее
  Features.NOTIFICATIONS,
  // ИИ-аналитик (этап 13 ТЗ): тумблер нужен на странице «Модули», иначе
  // включить раздел можно было бы только прямым SQL.
  Features.AI_ANALYST,
];
