import React from 'react';
import { FormattedMessage as T } from '@/components';
import { Features } from '@/constants/features';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';
import {
  ReportsAction,
  AbilitySubject,
  ItemAction,
  InventoryAdjustmentAction,
  SaleEstimateAction,
  SaleInvoiceAction,
  SaleReceiptAction,
  PaymentReceiveAction,
  BillAction,
  PaymentMadeAction,
  CustomerAction,
  VendorAction,
  AccountAction,
  ManualJournalAction,
  ExpenseAction,
  CashflowAction,
  PreferencesAbility,
  TaxRateAction,
} from '@/constants/abilityOption';

/**
 * Боковое меню — восемь пунктов (этап 1 ТЗ, п. 1.2).
 *
 * До перестройки верхний уровень насчитывал четырнадцать пунктов и местами
 * три уровня вложенности: собственник заходил посчитать деньги, а ему первым
 * делом предлагали склад и выставление счетов. Платёжный календарь, бюджеты,
 * сделки и долги лежали на 10–11 позициях внутри «Управления».
 *
 * Теперь порядок отвечает трём вопросам из ЧАСТИ A5 ТЗ: сколько денег, сколько
 * заработали, куда утекает. Сначала «Операции» — главный рабочий экран, затем
 * «Отчёты» и «Планирование», и только потом справочники и настройки.
 *
 * Что важно знать при правке:
 *
 * - Боковая панель схлопывает дерево: каждый пункт верхнего уровня становится
 *   ГРУППОЙ, а все ссылки внутри — её плоским списком (`ConnectedSidebar`).
 *   Поэтому вложенность здесь нужна только для чтения глазами.
 * - Формы создания (`/items/new` и подобные) панель отбрасывает сама, поэтому
 *   прежние подгруппы «Новые задачи» убраны: они удваивали меню, ничего не
 *   давая. Сами маршруты создания живы, на них попадают со своих экранов.
 * - `accountantOnly: true` прячет пункт в режиме «Бизнес» (п. 1.3 ТЗ).
 * - Ни один адрес при перестройке не потерян: сторож
 *   `routes/navigationReachability.spec.ts` следит, что каждая корневая
 *   страница модуля достижима кликом.
 */
export const SidebarMenu = [
  // ---------------------------------------------------------------
  // 1. Главная
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.homepage'} />,
    href: '/',
    type: ISidebarMenuItemType.Link,
    matchExact: true,
  },

  // ---------------------------------------------------------------
  // 2. Операции — главный рабочий экран собственника
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.group.operations'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.operations.all'} />,
        href: '/cashflow-accounts/transactions',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Cashflow,
          ability: CashflowAction.View,
        },
      },
      {
        text: <T id={'sidebar.cash_bank_accounts'} />,
        href: '/cashflow-accounts',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Cashflow,
          ability: CashflowAction.View,
        },
      },
      {
        text: <T id={'sidebar.bank_rules'} />,
        href: '/bank-rules',
        type: ISidebarMenuItemType.Link,
      },
      // Сверка, история импорта и корзина (FT-040…FT-043 ТЗ-3).
      {
        text: <T id={'sidebar.operations.reconciliation'} />,
        href: '/cashflow-accounts/reconciliation',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Cashflow,
          ability: CashflowAction.View,
        },
      },
      {
        text: <T id={'sidebar.operations.imports'} />,
        href: '/cashflow-accounts/imports',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Cashflow,
          ability: CashflowAction.View,
        },
      },
      {
        text: <T id={'sidebar.operations.trash'} />,
        href: '/cashflow-accounts/trash',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Cashflow,
          ability: CashflowAction.View,
        },
      },
    ],
  },

  // ---------------------------------------------------------------
  // 3. Отчёты
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.reports'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        // «Деньги» ведут на ПРЯМОЙ отчёт по статьям: он отвечает на вопрос
        // «откуда пришли и куда ушли», а не сводит прибыль к остатку.
        text: <T id={'sidebar.reports.money'} />,
        href: '/financial-reports/cash-flow-articles',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_CASHFLOW_ARTICLES,
        },
      },
      {
        // Косвенный ДДС остаётся на месте и никуда не девается: он нужен
        // бухгалтеру. В режиме «Бизнес» его не видно (п. 1.3 ТЗ-1).
        text: <T id={'sidebar.reports.money_indirect'} />,
        href: '/financial-reports/cash-flow',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_CASHFLOW_ACCOUNT_TRANSACTION,
        },
      },
      {
        text: <T id={'sidebar.reports.profit'} />,
        href: '/financial-reports/profit-loss-sheet',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_PROFIT_LOSS,
        },
      },
      {
        text: <T id={'sidebar.balance_sheet'} />,
        href: '/financial-reports/balance-sheet',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_BALANCE_SHEET,
        },
      },
      {
        text: <T id={'sidebar.reports.debts_receivable'} />,
        href: '/financial-reports/receivable-aging-summary',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_AR_AGING_SUMMARY,
        },
      },
      {
        text: <T id={'sidebar.reports.debts_payable'} />,
        href: '/financial-reports/payable-aging-summary',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_AP_AGING_SUMMARY,
        },
      },
      {
        // Этап 9 ТЗ: отдельный экран, а не отчёт из общего списка —
        // он отвечает на вопрос «почему деньги уходят», а не «сколько».
        text: <T id={'sidebar.reports.expenses_analysis'} />,
        href: '/expenses-analysis',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_PROFIT_LOSS,
        },
      },
      {
        // Этап 11 ТЗ: главный отчёт СОБСТВЕННИКА. Стоит рядом с отчётами,
        // но отдельным пунктом — смотрят его не тогда же, когда сводят
        // месяц, а когда думают о бизнесе целиком.
        text: <T id={'sidebar.reports.capitalization'} />,
        href: '/capitalization',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_BALANCE_SHEET,
        },
      },
      {
        text: <T id={'sidebar.all_financial_reports'} />,
        href: '/financial-reports',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_BALANCE_SHEET,
        },
      },

      // Бухгалтерские отчёты: в режиме «Бизнес» скрыты (п. 1.3 ТЗ).
      {
        text: <T id={'sidebar.general_ledger'} />,
        href: '/financial-reports/general-ledger',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_GENERAL_LEDGET,
        },
      },
      {
        text: <T id={'sidebar.trial_balance_sheet'} />,
        href: '/financial-reports/trial-balance-sheet',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_TRIAL_BALANCE_SHEET,
        },
      },
      {
        text: <T id={'sidebar.journal'} />,
        href: '/financial-reports/journal-sheet',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.Report,
          ability: ReportsAction.READ_JOURNAL,
        },
      },

      // Аналитика: тоже бухгалтерская часть (п. 1.3 ТЗ).
      {
        text: <T id={'sidebar.vat_analysis'} />,
        href: '/vat-analysis',
        type: ISidebarMenuItemType.Link,
        feature: Features.VatAnalysis,
        accountantOnly: true,
        permission: { subject: AbilitySubject.Report, ability: ReportsAction.READ_SALES_TAX_LIABILITY_SUMMARY },
      },
      {
        text: <T id={'sidebar.financial_ratios'} />,
        href: '/financial-ratios',
        type: ISidebarMenuItemType.Link,
        feature: Features.FinancialRatios,
        accountantOnly: true,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },
      {
        text: <T id={'sidebar.data_quality'} />,
        href: '/data-quality',
        type: ISidebarMenuItemType.Link,
        feature: Features.DataQuality,
        accountantOnly: true,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_TRIAL_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_GENERAL_LEDGET }],
      },
    ],
  },

  // ---------------------------------------------------------------
  // 4. Планирование
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.group.planning'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.payment_calendar'} />,
        href: '/payment-calendar',
        type: ISidebarMenuItemType.Link,
        feature: Features.PaymentCalendar,
        permission: { subject: AbilitySubject.Cashflow, ability: CashflowAction.View },
      },
      {
        text: <T id={'sidebar.budgets'} />,
        href: '/budgets',
        type: ISidebarMenuItemType.Link,
        feature: Features.Budgets,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_CASHFLOW_ARTICLES }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_MANAGERIAL_PROFIT_LOSS }],
      },
      {
        text: <T id={'sidebar.payment_requests'} />,
        href: '/payment-requests',
        type: ISidebarMenuItemType.Link,
        feature: Features.PaymentRequests,
      },
      {
        text: <T id={'sidebar.financial_model'} />,
        href: '/financial-model',
        type: ISidebarMenuItemType.Link,
        feature: Features.FinancialModel,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },
      {
        // Этап 14 ТЗ. Пункт появляется только с включённым разделом: вести
        // человека туда, где ему ответят «раздел выключен», — обман.
        text: <T id={'ai_chat.page.title'} />,
        href: '/ai-chat',
        type: ISidebarMenuItemType.Link,
        feature: Features.AiAnalyst,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },
    ],
  },

  // ---------------------------------------------------------------
  // 5. Сделки
  //
  // Подпункта «Проекты» здесь пока нет: раздел мёртв, серверных ручек
  // `projects/*` не существует ни одной. Владелец решил его оживлять
  // (отдельная работа, строка «П» в `docs/tz/STATE.md`) — пункт добавится,
  // когда появится, куда вести.
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.group.deals'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.deals'} />,
        href: '/deals',
        type: ISidebarMenuItemType.Link,
        feature: Features.Projects,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_MANAGERIAL_PROFIT_LOSS }, { subject: AbilitySubject.Invoice, ability: SaleInvoiceAction.View }],
      },
      {
        text: <T id={'sidebar.debts'} />,
        href: '/debts',
        type: ISidebarMenuItemType.Link,
        feature: Features.Debts,
        permission: [{ subject: AbilitySubject.Invoice, ability: SaleInvoiceAction.View }, { subject: AbilitySubject.Bill, ability: BillAction.View }],
      },
      {
        text: <T id={'sidebar.credits'} />,
        href: '/credits',
        type: ISidebarMenuItemType.Link,
        feature: Features.Credits,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },
    ],
  },

  // ---------------------------------------------------------------
  // 6. Контрагенты
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.group.counterparties'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.customers'} />,
        href: '/customers',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Customer,
          ability: CustomerAction.View,
        },
      },
      {
        text: <T id={'sidebar.vendors'} />,
        href: '/vendors',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Vendor,
          ability: VendorAction.View,
        },
      },
    ],
  },

  // ---------------------------------------------------------------
  // 7. Справочники
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.group.directories'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        // Юрлица (этап 6 ТЗ, §6.4). Пункт в меню есть всегда: завести второе
        // юрлицо надо откуда-то. Навязывание — это колонки и фильтры в
        // других разделах, и они появляются только со вторым юрлицом.
        text: <T id={'sidebar.legal_entities'} />,
        href: '/legal-entities',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Preferences,
          ability: PreferencesAbility.Mutate,
        },
      },
      {
        // Направления (проекты) — разрез операций наравне со статьёй.
        // Пункт есть всегда: первое направление надо откуда-то завести.
        text: <T id={'sidebar.directions'} />,
        href: '/directions',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Preferences,
          ability: PreferencesAbility.Mutate,
        },
      },
      {
        text: <T id={'sidebar.management_articles'} />,
        href: '/management-articles',
        type: ISidebarMenuItemType.Link,
        feature: Features.MgmtArticles,
      },
      {
        text: <T id={'sidebar.items'} />,
        href: '/items',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Item,
          ability: ItemAction.View,
        },
      },
      {
        text: <T id={'sidebar.payroll'} />,
        href: '/payroll',
        type: ISidebarMenuItemType.Link,
        feature: Features.Payroll,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },
      {
        text: <T id={'sidebar.fixed_assets'} />,
        href: '/fixed-assets',
        type: ISidebarMenuItemType.Link,
        feature: Features.FixedAssets,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },
      {
        text: <T id={'sidebar.tax_rates'} />,
        href: '/tax-rates',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.TaxRate,
          ability: TaxRateAction.View,
        },
      },
      {
        text: <T id={'sidebar.cost_allocation'} />,
        href: '/cost-allocation',
        type: ISidebarMenuItemType.Link,
        feature: Features.CostAllocation,
      },
      {
        text: <T id={'sidebar.dividends'} />,
        href: '/dividends',
        type: ISidebarMenuItemType.Link,
        feature: Features.Dividends,
        permission: [{ subject: AbilitySubject.Report, ability: ReportsAction.READ_BALANCE_SHEET }, { subject: AbilitySubject.Report, ability: ReportsAction.READ_PROFIT_LOSS }],
      },

      // Склад и бухгалтерия: в режиме «Бизнес» скрыты (п. 1.3 ТЗ).
      {
        text: <T id={'categories_list'} />,
        href: '/items/categories',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.Item,
          ability: ItemAction.View,
        },
      },
      {
        text: <T id={'sidebar.inventory_adjustments'} />,
        href: '/inventory-adjustments',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.InventoryAdjustment,
          ability: InventoryAdjustmentAction.View,
        },
      },
      {
        text: <T id={'sidebar.warehouse_transfer'} />,
        href: '/warehouses-transfers',
        type: ISidebarMenuItemType.Link,
        feature: Features.Warehouses,
        accountantOnly: true,
      },
      {
        text: <T id={'sidebar.accounts_chart'} />,
        href: '/accounts',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.Account,
          ability: AccountAction.View,
        },
      },
      {
        text: <T id={'sidebar.manual_journals'} />,
        href: '/manual-journals',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.ManualJournal,
          ability: ManualJournalAction.View,
        },
      },
      {
        text: <T id={'sidebar.make_journal_entry'} />,
        href: '/make-journal-entry',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
        permission: {
          subject: AbilitySubject.ManualJournal,
          ability: ManualJournalAction.Create,
        },
      },
      {
        text: <T id={'sidebar.transactions_locaking'} />,
        href: '/transactions-locking',
        type: ISidebarMenuItemType.Link,
        accountantOnly: true,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 8. Настройки — вместе с интеграциями
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.preferences'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.preferences'} />,
        href: '/preferences',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Preferences,
          ability: PreferencesAbility.Mutate,
        },
      },
      {
        text: <T id={'sidebar.bank_api'} />,
        href: '/bank-api-sync',
        type: ISidebarMenuItemType.Link,
        feature: Features.BankApiSync,
      },
      {
        text: <T id={'sidebar.acquiring'} />,
        href: '/acquiring',
        type: ISidebarMenuItemType.Link,
        feature: Features.Acquiring,
      },
      {
        text: <T id={'sidebar.moysklad'} />,
        href: '/moysklad',
        type: ISidebarMenuItemType.Link,
        feature: Features.Moysklad,
      },
      {
        text: <T id={'sidebar.marketplaces'} />,
        href: '/marketplaces',
        type: ISidebarMenuItemType.Link,
        feature: Features.Marketplaces,
      },
      {
        text: <T id={'sidebar.onec_import'} />,
        href: '/onec-import',
        type: ISidebarMenuItemType.Link,
        feature: Features.OnecImport,
      },
      {
        text: <T id={'sidebar.onec_export'} />,
        href: '/onec-export',
        type: ISidebarMenuItemType.Link,
        feature: Features.OnecExport,
      },
      {
        text: <T id={'sidebar.zenmoney'} />,
        href: '/zenmoney',
        type: ISidebarMenuItemType.Link,
        feature: Features.Zenmoney,
      },
      {
        text: <T id={'sidebar.crm_integration'} />,
        href: '/crm-integration',
        type: ISidebarMenuItemType.Link,
        feature: Features.CrmIntegration,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 9. Документы — под выключателем, по умолчанию выключен (п. 1.4 ТЗ)
  //
  // Первичка нужна тем, кто выставляет её из Bigfin, а не тем, кто ведёт
  // управленческий учёт. Включается в «Настройки → Модули», после чего
  // появляется девятым пунктом меню.
  // ---------------------------------------------------------------
  {
    text: <T id={'sidebar.group.documents'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.invoices'} />,
        href: '/invoices',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.Invoice,
          ability: SaleInvoiceAction.View,
        },
      },
      {
        text: <T id={'sidebar.estimates'} />,
        href: '/estimates',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.Estimate,
          ability: SaleEstimateAction.View,
        },
      },
      {
        text: <T id={'sidebar.receipts'} />,
        href: '/receipts',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.Receipt,
          ability: SaleReceiptAction.View,
        },
      },
      {
        text: <T id={'sidebar.credit_notes'} />,
        href: '/credit-notes',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
      },
      {
        text: <T id={'sidebar.payments_received'} />,
        href: '/payments-received',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.PaymentReceive,
          ability: PaymentReceiveAction.View,
        },
      },
      {
        text: <T id={'bills'} />,
        href: '/bills',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.Bill,
          ability: BillAction.View,
        },
      },
      {
        text: <T id={'sidebar_vendor_credits'} />,
        href: '/vendor-credits',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
      },
      {
        text: <T id={'payments_made'} />,
        href: '/payments-made',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.PaymentMade,
          ability: PaymentMadeAction.View,
        },
      },
      {
        text: <T id={'sidebar.expenses'} />,
        href: '/expenses',
        type: ISidebarMenuItemType.Link,
        feature: Features.Documents,
        permission: {
          subject: AbilitySubject.Expense,
          ability: ExpenseAction.View,
        },
      },
    ],
  },
];
