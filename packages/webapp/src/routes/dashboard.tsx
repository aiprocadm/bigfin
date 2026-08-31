// @ts-nocheck
import { lazy } from 'react';
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';

// Флага subscriptionActive в маршрутах больше нет (Р3 карты v16):
// он жил в ~130 строках, и его не читал никто — наследство биллинга
// зарубежного предшественника. Сторож в navigationReachability.spec.ts
// не даст ему вернуться.
export const getDashboardRoutes = () => [
  // Accounts.
  {
    path: '/accounts/import',
    component: lazy(() => import('@/containers/Accounts/AccountsImport')),
    breadcrumb: intl.get('accounts_import'),
    pageTitle: intl.get('accounts_import'),
  },
  {
    path: `/accounts`,
    component: lazy(() => import('@/containers/Accounts/AccountsChart')),
    breadcrumb: intl.get('accounts_chart'),
    hotkey: 'shift+a',
    pageTitle: intl.get('accounts_chart'),
    defaultSearchResource: RESOURCES_TYPES.ACCOUNT,
  },
  // Accounting.
  {
    path: `/make-journal-entry`,
    component: lazy(
      () =>
        import('@/containers/Accounting/MakeJournal/MakeJournalEntriesPage'),
    ),
    breadcrumb: intl.get('make_journal_entry'),
    hotkey: 'ctrl+shift+m',
    pageTitle: intl.get('new_journal'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.MANUAL_JOURNAL,
  },
  {
    path: `/manual-journals/:id/edit`,
    component: lazy(
      () =>
        import('@/containers/Accounting/MakeJournal/MakeJournalEntriesPage'),
    ),
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_journal'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.MANUAL_JOURNAL,
  },
  {
    path: `/manual-journals/import`,
    component: lazy(
      () => import('@/containers/Accounting/ManualJournalsImport'),
    ),
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('manual_journals_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.MANUAL_JOURNAL,
  },
  {
    path: `/manual-journals`,
    component: lazy(
      () =>
        import('@/containers/Accounting/JournalsLanding/ManualJournalsList'),
    ),
    breadcrumb: intl.get('manual_journals'),
    hotkey: 'shift+m',
    pageTitle: intl.get('manual_journals'),
    defaultSearchResource: RESOURCES_TYPES.MANUAL_JOURNAL,
  },
  {
    path: `/item/categories/import`,
    component: lazy(
      () => import('@/containers/ItemsCategories/ItemCategoriesImport'),
    ),
    backLink: true,
    pageTitle: intl.get('item_categories_import'),
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },
  {
    path: `/items/categories`,
    component: lazy(
      () => import('@/containers/ItemsCategories/ItemCategoriesList'),
    ),
    breadcrumb: intl.get('categories'),
    pageTitle: intl.get('categories_list'),
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },
  // Items.
  {
    path: `/items/import`,
    component: lazy(() => import('@/containers/Items/ItemsImportPage')),
    backLink: true,
    pageTitle: intl.get('items_import'),
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },

  {
    path: `/items/:id/edit`,
    component: lazy(() => import('@/containers/Items/ItemFormPage')),
    name: 'item-edit',
    breadcrumb: intl.get('edit_item'),
    pageTitle: intl.get('edit_item'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },
  {
    path: `/items/new?duplicate=/:id`,
    component: lazy({
      loader: () => import('@/containers/Items/ItemFormPage'),
    }),
    breadcrumb: intl.get('duplicate_item'),
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },
  {
    path: `/items/new`,
    component: lazy(() => import('@/containers/Items/ItemFormPage')),
    name: 'item-new',
    breadcrumb: intl.get('new_item'),
    hotkey: 'ctrl+shift+w',
    pageTitle: intl.get('new_item'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },
  {
    path: `/items`,
    component: lazy(() => import('@/containers/Items/ItemsList')),
    breadcrumb: intl.get('items'),
    hotkey: 'shift+w',
    pageTitle: intl.get('items_list'),
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },

  // Inventory adjustments.
  {
    path: `/inventory-adjustments`,
    component: lazy(
      () => import('@/containers/InventoryAdjustments/InventoryAdjustmentList'),
    ),
    breadcrumb: intl.get('inventory_adjustments'),
    pageTitle: intl.get('inventory_adjustment_list'),
    defaultSearchResource: RESOURCES_TYPES.ITEM,
  },

  // Warehouse Transfer.
  {
    path: `/warehouses-transfers/:id/edit`,
    component: lazy(
      () =>
        import(
          '@/containers/WarehouseTransfers/WarehouseTransferForm/WarehouseTransferFormPage'
        ),
    ),
    name: 'warehouse-transfer-edit',
    pageTitle: intl.get('warehouse_transfer.label.edit_warehouse_transfer'),
    sidebarExpand: false,
    backLink: true,
  },
  {
    path: `/warehouses-transfers/new`,
    component: lazy(
      () =>
        import(
          '@/containers/WarehouseTransfers/WarehouseTransferForm/WarehouseTransferFormPage'
        ),
    ),
    name: 'warehouses-transfer-new',
    pageTitle: intl.get('warehouse_transfer.label.new_warehouse_transfer'),
    sidebarExpand: false,
    backLink: true,
  },
  {
    path: `/warehouses-transfers`,
    component: lazy(
      () =>
        import(
          '@/containers/WarehouseTransfers/WarehouseTransfersLanding/WarehouseTransfersList'
        ),
    ),
    pageTitle: intl.get('warehouse_transfer.label.warehouse_transfer_list'),
    // defaultSearchResource: RESOURCES_TYPES.ITEM,
  },

  // Financial Reports.
  {
    path: `/financial-reports/general-ledger`,
    component: lazy(
      () =>
        import('@/containers/FinancialStatements/GeneralLedger/GeneralLedger'),
    ),
    breadcrumb: intl.get('general_ledger'),
    hint: intl.get('reports_every_transaction_going_in_and_out_of_your'),
    hotkey: 'shift+4',
    pageTitle: intl.get('general_ledger'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.MANUAL_JOURNAL,
  },
  {
    path: `/financial-reports/balance-sheet`,
    component: lazy(
      () =>
        import('@/containers/FinancialStatements/BalanceSheet/BalanceSheet'),
    ),
    breadcrumb: intl.get('balance_sheet'),
    hint: intl.get('reports_a_company_s_assets_liabilities_and_shareholders'),
    hotkey: 'shift+1',
    pageTitle: intl.get('balance_sheet'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/trial-balance-sheet`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/TrialBalanceSheet/TrialBalanceSheet'
        ),
    ),
    breadcrumb: intl.get('trial_balance_sheet'),
    hint: intl.get('summarizes_the_credit_and_debit_balance_of_each_account'),
    hotkey: 'shift+5',
    pageTitle: intl.get('trial_balance_sheet'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/profit-loss-sheet`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/ProfitLossSheet/ProfitLossSheet'
        ),
    ),
    breadcrumb: intl.get('profit_loss_sheet'),
    hint: intl.get('reports_the_revenues_costs_and_expenses'),
    hotkey: 'shift+2',
    pageTitle: intl.get('profit_loss_sheet'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: '/financial-reports/receivable-aging-summary',
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/ARAgingSummary/ARAgingSummary'
        ),
    ),
    breadcrumb: intl.get('receivable_aging_summary'),
    hint: intl.get('summarize_total_unpaid_balances_of_customers_invoices'),
    pageTitle: intl.get('receivable_aging_summary'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: '/financial-reports/payable-aging-summary',
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/APAgingSummary/APAgingSummary'
        ),
    ),
    breadcrumb: intl.get('payable_aging_summary'),
    hint: intl.get('summarize_total_unpaid_balances_of_vendors_purchase'),
    pageTitle: intl.get('payable_aging_summary'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/journal-sheet`,
    component: lazy(
      () => import('@/containers/FinancialStatements/Journal/Journal'),
    ),
    breadcrumb: intl.get('journal_sheet'),
    hint: intl.get('the_debit_and_credit_entries_of_system_transactions'),
    hotkey: 'shift+3',
    pageTitle: intl.get('journal_sheet'),
    sidebarExpand: false,
    backLink: true,
  },
  {
    path: `/financial-reports/purchases-by-items`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/PurchasesByItems/PurchasesByItems'
        ),
    ),
    breadcrumb: intl.get('purchases_by_items'),
    // hotkey: '',
    pageTitle: intl.get('purchases_by_items'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/sales-by-items`,
    component: lazy(
      () =>
        import('@/containers/FinancialStatements/SalesByItems/SalesByItems'),
    ),
    breadcrumb: intl.get('sales_by_items'),
    pageTitle: intl.get('sales_by_items'),
    hint: intl.get(
      'summarize_the_business_s_sold_items_quantity_income_and_average_income_rate',
    ),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/inventory-valuation`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/InventoryValuation/InventoryValuation'
        ),
    ),
    breadcrumb: intl.get('inventory_valuation'),
    hint: intl.get('summerize_your_transactions_for_each_inventory_item'),
    pageTitle: intl.get('inventory_valuation'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/customers-balance-summary`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/CustomersBalanceSummary/CustomersBalanceSummary'
        ),
    ),
    breadcrumb: intl.get('customers_balance_summary'),
    hint: intl.get('summerize_how_much_each_customer_owes_your_business'),
    pageTitle: intl.get('customers_balance_summary'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/vendors-balance-summary`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/VendorsBalanceSummary/VendorsBalanceSummary'
        ),
    ),
    breadcrumb: intl.get('vendors_balance_summary'),
    hint: intl.get('summerize_the_total_amount_your_business_owes_each_vendor'),
    pageTitle: intl.get('vendors_balance_summary'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/transactions-by-customers`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/CustomersTransactions/CustomersTransactions'
        ),
    ),
    breadcrumb: intl.get('customers_transactions'),
    hint: intl.get(
      'reports_every_transaction_going_in_and_out_of_each_customer',
    ),
    pageTitle: intl.get('customers_transactions'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/transactions-by-vendors`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/VendorsTransactions/VendorsTransactions'
        ),
    ),
    breadcrumb: intl.get('vendors_transactions'),
    hint: intl.get(
      'reports_every_transaction_going_in_and_out_of_each_vendor_supplier',
    ),
    pageTitle: intl.get('vendors_transactions'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/cash-flow`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/CashFlowStatement/CashFlowStatement'
        ),
    ),
    breadcrumb: intl.get('cash_flow_statement'),
    hint: intl.get('reports_inflow_and_outflow_of_cash_and_cash_equivalents'),
    pageTitle: intl.get('cash_flow_statement'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/inventory-item-details`,
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/InventoryItemDetails/InventoryItemDetails'
        ),
    ),
    breadcrumb: intl.get('inventory_item_details'),
    hint: intl.get('reports_every_transaction_going_in_and_out_of_your_items'),
    pageTitle: intl.get('inventory_item_details'),
    backLink: true,
    sidebarExpand: false,
  },
  // Отчёта «Прибыльность проектов» в маршрутах больше нет (К2 карты v17):
  // хвост закрытого раздела «Проекты» (вопрос 31) — серверной ручки не
  // существует, хук бил в несуществующий адрес, а прямая ссылка открывала
  // битый экран. Файлы страницы не удалены — их удаление отдельное решение.

  {
    path: '/financial-reports/sales-tax-liability-summary',
    component: lazy(
      () =>
        import(
          '@/containers/FinancialStatements/SalesTaxLiabilitySummary/SalesTaxLiabilitySummary'
        ),
    ),
    breadcrumb: intl.get('sales_tax_liability_summary'),
    pageTitle: intl.get('sales_tax_liability_summary'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: `/financial-reports/audit-log`,
    component: lazy(
      () => import('@/containers/FinancialStatements/AuditLog/AuditLogReport'),
    ),
    breadcrumb: intl.get('audit_log_report'),
    pageTitle: intl.get('audit_log_report'),
    backLink: true,
    sidebarExpand: false,
  },
  {
    path: '/financial-reports',
    component: lazy(
      () => import('@/containers/FinancialStatements/FinancialReports'),
    ),
    breadcrumb: intl.get('financial_reports'),
    pageTitle: intl.get('all_financial_reports'),
  },
  // Expenses.
  {
    path: `/expenses/import`,
    component: lazy(() => import('@/containers/Expenses/ExpensesImport')),
    breadcrumb: intl.get('expenses_import'),
    hotkey: 'ctrl+shift+x',
    pageTitle: intl.get('expenses_import'),
    sidebarExpand: false,
    backLink: true,
  },
  {
    path: `/expenses/new`,
    component: lazy(
      () => import('@/containers/Expenses/ExpenseForm/ExpenseFormPage'),
    ),
    breadcrumb: intl.get('expenses'),
    hotkey: 'ctrl+shift+x',
    pageTitle: intl.get('new_expense'),
    sidebarExpand: false,
    backLink: true,
  },
  {
    path: `/expenses/:id/edit`,
    component: lazy(
      () => import('@/containers/Expenses/ExpenseForm/ExpenseFormPage'),
    ),
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_expense'),
    sidebarExpand: false,
    backLink: true,
  },
  {
    path: `/expenses`,
    component: lazy(
      () => import('@/containers/Expenses/ExpensesLanding/ExpensesList'),
    ),
    breadcrumb: intl.get('expenses_list'),
    pageTitle: intl.get('expenses_list'),
    hotkey: 'shift+x',
    defaultSearchResource: RESOURCES_TYPES.EXPENSE,
  },
  // Customers
  {
    path: `/customers/import`,
    component: lazy(() => import('@/containers/Customers/CustomersImport')),
    backLink: true,
    pageTitle: intl.get('customers_import'),
    defaultSearchResource: RESOURCES_TYPES.CUSTOMER,
  },
  {
    path: `/customers/:id/edit`,
    component: lazy(
      () => import('@/containers/Customers/CustomerForm/CustomerFormPage'),
    ),
    name: 'customer-edit',
    breadcrumb: intl.get('edit_customer'),
    pageTitle: intl.get('edit_customer'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.CUSTOMER,
  },
  {
    path: `/customers/new`,
    component: lazy(
      () => import('@/containers/Customers/CustomerForm/CustomerFormPage'),
    ),
    name: 'customer-new',
    breadcrumb: intl.get('new_customer'),
    hotkey: 'ctrl+shift+c',
    pageTitle: intl.get('new_customer'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.CUSTOMER,
  },
  {
    path: `/customers`,
    component: lazy(
      () =>
        import(
          '@/containers/Customers/CustomersLandingV2/CustomersListSwitch'
        ),
    ),
    breadcrumb: intl.get('customers'),
    hotkey: 'shift+c',
    pageTitle: intl.get('customers_list'),
    defaultSearchResource: RESOURCES_TYPES.CUSTOMER,
  },
  {
    path: `/customers/contact_duplicate=/:id`,
    component: lazy(
      () => import('@/containers/Customers/CustomerForm/CustomerFormPage'),
    ),
    name: 'duplicate-customer',
    breadcrumb: intl.get('duplicate_customer'),
    pageTitle: intl.get('new_customer'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.CUSTOMER,
  },

  // Vendors
  {
    path: `/vendors/import`,
    component: lazy(() => import('@/containers/Vendors/VendorsImport')),
    backLink: true,
    pageTitle: intl.get('vendors_import'),
    defaultSearchResource: RESOURCES_TYPES.VENDOR,
  },
  {
    path: `/vendors/:id/edit`,
    component: lazy(
      () => import('@/containers/Vendors/VendorForm/VendorFormPage').then(module => ({ default: module.VendorFormPage })),
    ),
    name: 'vendor-edit',
    breadcrumb: intl.get('edit_vendor'),
    pageTitle: intl.get('edit_vendor'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.VENDOR,
  },
  {
    path: `/vendors/new`,
    component: lazy(
      () => import('@/containers/Vendors/VendorForm/VendorFormPage').then(module => ({ default: module.VendorFormPage })),
    ),
    name: 'vendor-new',
    breadcrumb: intl.get('new_vendor'),
    hotkey: 'ctrl+shift+v',
    pageTitle: intl.get('new_vendor'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.VENDOR,
  },
  {
    path: `/vendors`,
    component: lazy(
      () => import('@/containers/Vendors/VendorsLandingV2/VendorsListSwitch'),
    ),
    breadcrumb: intl.get('vendors'),
    hotkey: 'shift+v',
    pageTitle: intl.get('vendors_list'),
    defaultSearchResource: RESOURCES_TYPES.VENDOR,
  },
  {
    path: `/vendors/contact_duplicate=/:id`,
    component: lazy(
      () => import('@/containers/Vendors/VendorForm/VendorFormPage'),
    ),
    name: 'duplicate-vendor',
    breadcrumb: intl.get('duplicate_vendor'),
    pageTitle: intl.get('new_vendor'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.VENDOR,
  },

  // Estimates
  {
    path: `/estimates/import`,
    component: lazy(
      () => import('@/containers/Sales/Estimates/EstimatesImport'),
    ),
    name: 'estimate-edit',
    breadcrumb: intl.get('estimates_import'),
    pageTitle: intl.get('estimates_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.ESTIMATE,
  },
  {
    path: `/estimates/:id/edit`,
    component: lazy(
      () =>
        import('@/containers/Sales/Estimates/EstimateForm/v2/EstimateFormPageV2'),
    ),
    name: 'estimate-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_estimate'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.ESTIMATE,
  },
  {
    path: `/invoices/new?from_estimate_id=/:id`,
    component: lazy(
      () =>
        import('@/containers/Sales/Estimates/EstimateForm/v2/EstimateFormPageV2'),
    ),
    name: 'convert-to-invoice',
    breadcrumb: intl.get('new_estimate'),
    pageTitle: intl.get('new_estimate'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.INVOICE,
  },
  {
    path: `/estimates/new`,
    component: lazy(
      () =>
        import('@/containers/Sales/Estimates/EstimateForm/v2/EstimateFormPageV2'),
    ),
    name: 'estimate-new',
    breadcrumb: intl.get('new_estimate'),
    hotkey: 'ctrl+shift+e',
    pageTitle: intl.get('new_estimate'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.ESTIMATE,
  },
  {
    path: `/estimates`,
    component: lazy(
      () =>
        import('@/containers/Sales/Estimates/EstimatesLanding/EstimatesList'),
    ),
    name: 'estimates-list',
    breadcrumb: intl.get('estimates_list'),
    hotkey: 'shift+e',
    pageTitle: intl.get('estimates_list'),
    defaultSearchResource: RESOURCES_TYPES.ESTIMATE,
  },

  // Invoices.
  {
    path: `/invoices/import`,
    component: lazy(() => import('@/containers/Sales/Invoices/InvoicesImport')),
    name: 'invoice-edit',
    breadcrumb: intl.get('invoices_import'),
    pageTitle: intl.get('invoices_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.INVOICE,
  },
  {
    path: `/invoices/:id/edit`,
    component: lazy(
      () => import('@/containers/Sales/Invoices/InvoiceForm/v2/InvoiceFormPageV2'),
    ),
    name: 'invoice-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_invoice'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.INVOICE,
  },
  {
    path: `/invoices/new`,
    component: lazy(
      () => import('@/containers/Sales/Invoices/InvoiceForm/v2/InvoiceFormPageV2'),
    ),
    name: 'invoice-new',
    breadcrumb: intl.get('new_invoice'),
    hotkey: 'ctrl+shift+i',
    pageTitle: intl.get('new_invoice'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.INVOICE,
  },
  {
    path: `/invoices`,
    component: lazy(
      () => import('@/containers/Sales/Invoices/InvoicesLanding/InvoicesList'),
    ),
    breadcrumb: intl.get('invoices_list'),
    hotkey: 'shift+i',
    pageTitle: intl.get('invoices_list'),
    defaultSearchResource: RESOURCES_TYPES.INVOICE,
  },
  // Sales Receipts.
  {
    path: `/receipts/import`,
    component: lazy(
      () => import('@/containers/Sales/Receipts/SaleReceiptsImport'),
    ),
    name: 'receipt-import',
    breadcrumb: intl.get('receipts_import'),
    pageTitle: intl.get('receipts_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.RECEIPT,
  },
  {
    path: `/receipts/:id/edit`,
    component: lazy(
      () => import('@/containers/Sales/Receipts/ReceiptForm/v2/ReceiptFormPageV2'),
    ),
    name: 'receipt-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_receipt'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.RECEIPT,
  },
  {
    path: `/receipts/new`,
    component: lazy(
      () => import('@/containers/Sales/Receipts/ReceiptForm/v2/ReceiptFormPageV2'),
    ),
    name: 'receipt-new',
    breadcrumb: intl.get('new_receipt'),
    hotkey: 'ctrl+shift+r',
    pageTitle: intl.get('new_receipt'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.RECEIPT,
  },
  {
    path: `/receipts`,
    component: lazy(
      () => import('@/containers/Sales/Receipts/ReceiptsLanding/ReceiptsList'),
    ),
    breadcrumb: intl.get('receipts_list'),
    hotkey: 'shift+r',
    pageTitle: intl.get('receipts_list'),
    defaultSearchResource: RESOURCES_TYPES.RECEIPT,
  },

  // Sales Credit notes.
  {
    path: `/credit-notes/import`,
    component: lazy(
      () => import('@/containers/Sales/CreditNotes/CreditNotesImport'),
    ),
    name: 'credit-note-import',
    breadcrumb: intl.get('credit_notes_import'),
    pageTitle: intl.get('credit_notes_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.CREDIT_NOTE,
  },
  {
    path: `/credit-notes/:id/edit`,
    component: lazy(
      () =>
        import(
          '@/containers/Sales/CreditNotes/CreditNoteForm/CreditNoteFormPage'
        ),
    ),
    name: 'credit-note-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('credit_note.label.edit_credit_note'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.CREDIT_NOTE,
  },
  {
    path: `/credit-notes/new/?from_invoice_id=/:id`,
    component: lazy(
      () =>
        import(
          '@/containers/Sales/CreditNotes/CreditNoteForm/CreditNoteFormPage'
        ),
    ),
    name: 'credit-note-new',
    breadcrumb: intl.get('credit_note.label.new_credit_note'),
    backLink: true,
    sidebarExpand: false,
    pageTitle: intl.get('credit_note.label.new_credit_note'),
    defaultSearchResource: RESOURCES_TYPES.CREDIT_NOTE,
  },
  {
    path: '/credit-notes/new',
    component: lazy(
      () =>
        import(
          '@/containers/Sales/CreditNotes/CreditNoteForm/CreditNoteFormPage'
        ),
    ),
    name: 'credit-note-new',
    breadcrumb: intl.get('credit_note.label.new_credit_note'),
    backLink: true,
    sidebarExpand: false,
    pageTitle: intl.get('credit_note.label.new_credit_note'),
    defaultSearchResource: RESOURCES_TYPES.CREDIT_NOTE,
  },
  {
    path: '/credit-notes',
    component: lazy(
      () =>
        import(
          '@/containers/Sales/CreditNotes/CreditNotesLanding/CreditNotesList'
        ),
    ),
    breadcrumb: intl.get('credit_note.label_create_note_list'),
    pageTitle: intl.get('credit_note.label_create_note_list'),
    defaultSearchResource: RESOURCES_TYPES.CREDIT_NOTE,
  },
  // Payment receives
  {
    path: `/payments-received/import`,
    component: lazy(
      () => import('@/containers/Sales/PaymentsReceived/PaymentsReceivedImport'),
    ),
    name: 'payment-receive-import',
    breadcrumb: intl.get('payments_received_import'),
    pageTitle: intl.get('payments_received_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_RECEIVE,
  },
  {
    path: `/payments-received/:id/edit`,
    component: lazy(
      () =>
        import(
          '@/containers/Sales/PaymentsReceived/PaymentReceiveForm/PaymentReceiveFormPage'
        ),
    ),
    name: 'payment-receive-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_payment_received'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_RECEIVE,
  },
  {
    path: `/payment-received/new`,
    component: lazy(
      () =>
        import(
          '@/containers/Sales/PaymentsReceived/PaymentReceiveForm/PaymentReceiveFormPage'
        ),
    ),
    name: 'payment-receive-new',
    breadcrumb: intl.get('new_payment_received'),
    pageTitle: intl.get('new_payment_received'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_RECEIVE,
  },
  {
    path: `/payments-received`,
    component: lazy(
      () =>
        import(
          '@/containers/Sales/PaymentsReceived/PaymentsLanding/PaymentsReceivedList'
        ),
    ),
    breadcrumb: intl.get('payments_received_list'),
    pageTitle: intl.get('payments_received_list'),
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_RECEIVE,
  },

  // Bills
  {
    path: `/bills/import`,
    component: lazy(() => import('@/containers/Purchases/Bills/BillImport')),
    name: 'bill-edit',
    // breadcrumb: intl.get('edit'),
    pageTitle: intl.get('bills_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.BILL,
  },
  {
    path: `/bills/:id/edit`,
    component: lazy(
      () => import('@/containers/Purchases/Bills/BillForm/v2/BillFormPageV2'),
    ),
    name: 'bill-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_bill'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.BILL,
  },
  {
    path: `/bills/new`,
    component: lazy(
      () => import('@/containers/Purchases/Bills/BillForm/v2/BillFormPageV2'),
    ),
    name: 'bill-new',
    breadcrumb: intl.get('new_bill'),
    hotkey: 'ctrl+shift+b',
    pageTitle: intl.get('new_bill'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.BILL,
  },
  {
    path: `/bills`,
    component: lazy(
      () => import('@/containers/Purchases/Bills/BillsLanding/BillsList'),
    ),
    breadcrumb: intl.get('bills_list'),
    hotkey: 'shift+b',
    pageTitle: intl.get('bills_list'),
    defaultSearchResource: RESOURCES_TYPES.BILL,
  },
  //  Purchases Credit note.
  {
    path: `/vendor-credits/import`,
    component: lazy(
      () => import('@/containers/Purchases/CreditNotes/VendorCreditsImport'),
    ),
    name: 'vendor-credits-edit',
    breadcrumb: intl.get('vendor_credits_import'),
    pageTitle: intl.get('vendor_credits_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.VENDOR_CREDIT,
  },
  {
    path: `/vendor-credits/:id/edit`,
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/CreditNotes/CreditNoteForm/VendorCreditNoteFormPage'
        ),
    ),
    name: 'vendor-credits-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('vendor_credits.label.edit_vendor_credit'),
    backLink: true,
    sidebarExpand: false,
    defaultSearchResource: RESOURCES_TYPES.VENDOR_CREDIT,
  },
  {
    path: '/vendor-credits/new/?from_bill_id=/:id',
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/CreditNotes/CreditNoteForm/VendorCreditNoteFormPage'
        ),
    ),
    name: 'vendor-credits-new',
    backLink: true,
    sidebarExpand: false,
    breadcrumb: intl.get('vendor_credits.label.new_vendor_credit'),
    pageTitle: intl.get('vendor_credits.label.new_vendor_credit'),
    defaultSearchResource: RESOURCES_TYPES.VENDOR_CREDIT,
  },
  {
    path: '/vendor-credits/new',
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/CreditNotes/CreditNoteForm/VendorCreditNoteFormPage'
        ),
    ),
    name: 'vendor-credits-new',
    backLink: true,
    sidebarExpand: false,
    breadcrumb: intl.get('vendor_credits.label.new_vendor_credit'),
    pageTitle: intl.get('vendor_credits.label.new_vendor_credit'),
    defaultSearchResource: RESOURCES_TYPES.VENDOR_CREDIT,
  },
  {
    path: '/vendor-credits',
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/CreditNotes/CreditNotesLanding/VendorsCreditNotesList'
        ),
    ),
    breadcrumb: intl.get('vendor_credits.lable_vendor_credit_list'),
    pageTitle: intl.get('vendor_credits.lable_vendor_credit_list'),
    defaultSearchResource: RESOURCES_TYPES.VENDOR_CREDIT,
  },

  // Payment modes.
  {
    path: `/payments-made/import`,
    component: lazy(
      () => import('@/containers/Purchases/PaymentsMade/PaymentsMadeImport'),
    ),
    name: 'payment-made-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('bills_payments_import'),
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_MADE,
  },
  {
    path: `/payments-made/:id/edit`,
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/PaymentsMade/PaymentForm/PaymentMadeFormPage'
        ),
    ),
    name: 'payment-made-edit',
    breadcrumb: intl.get('edit'),
    pageTitle: intl.get('edit_payment_made'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_MADE,
  },
  {
    path: `/payments-made/new`,
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/PaymentsMade/PaymentForm/PaymentMadeFormPage'
        ),
    ),
    name: 'payment-made-new',
    breadcrumb: intl.get('new_payment_made'),
    pageTitle: intl.get('new_payment_made'),
    sidebarExpand: false,
    backLink: true,
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_MADE,
  },
  {
    path: `/payments-made`,
    component: lazy(
      () =>
        import(
          '@/containers/Purchases/PaymentsMade/PaymentsLanding/PaymentMadeList'
        ),
    ),
    breadcrumb: intl.get('payments_made_list'),
    pageTitle: intl.get('payments_made_list'),
    defaultSearchResource: RESOURCES_TYPES.PAYMENT_MADE,
  },
  // Cash flow
  {
    path: `/cashflow-accounts/:id/transactions`,
    component: lazy(
      () =>
        import(
          '@/containers/CashFlow/AccountTransactions/AccountTransactionsList'
        ),
    ),
    sidebarExpand: false,
    backLink: true,
    pageTitle: intl.get('banking.label_account_transcations'),
    defaultSearchResource: RESOURCES_TYPES.ACCOUNT,
  },
  {
    path: `/cashflow-accounts/:id/import`,
    component: lazy(
      () =>
        import(
          '@/containers/CashFlow/ImportIUncategorizedTransactions/ImportUncategorizedTransactionsPage'
        ),
    ),
    backLink: true,
    sidebarExpand: false,
    pageTitle: intl.get('bank_transactions_import'),
    defaultSearchResource: RESOURCES_TYPES.ACCOUNT,
  },
  {
    path: `/cashflow-accounts`,
    component: lazy(
      () =>
        import('@/containers/CashFlow/CashFlowAccounts/CashFlowAccountsList'),
    ),
    pageTitle: intl.get('siebar.banking.bank_accounts'),
    defaultSearchResource: RESOURCES_TYPES.ACCOUNT,
  },
  {
    path: `/transactions-locking`,
    component: lazy(
      () => import('@/containers/TransactionsLocking/TransactionsLockingPage'),
    ),
    pageTitle: intl.get('sidebar.transactions_locaking'),
  },
  // Раздела «Проекты» в маршрутах больше нет (Р3 карты v16, вопрос 31):
  // страница разваливалась по прямой ссылке — серверных ручек projects/* не
  // существует ни одной, его место в Bigfin занимают «Сделки». Файлы страниц
  // не удалены — их удаление отдельное решение владельца.
  {
    path: '/tax-rates/import',
    component: lazy(
      () => import('@/containers/TaxRates/containers/TaxRatesImport'),
    ),
    pageTitle: intl.get('tax_rates'),
  },
  {
    path: '/tax-rates',
    component: lazy(
      () => import('@/containers/TaxRates/pages/TaxRatesLanding'),
    ),
    pageTitle: intl.get('tax_rates'),
  },
  // Bank Rules
  {
    path: '/bank-rules',
    component: lazy(
      () => import('@/containers/Banking/Rules/RulesList/RulesLandingPage'),
    ),
    pageTitle: intl.get('bank_rules'),
    breadcrumb: intl.get('bank_rules'),
  },
  // Management Articles
  {
    path: `/management-articles`,
    component: lazy(
      () => import('@/containers/ManagementArticles/ManagementArticlesPage'),
    ),
    breadcrumb: intl.get('management_articles.page_title'),
    pageTitle: intl.get('management_articles.page_title'),
  },
  // Payment Calendar
  {
    path: `/payment-calendar`,
    component: lazy(
      () => import('@/containers/PaymentCalendar/PaymentCalendarPage'),
    ),
    breadcrumb: intl.get('payment_calendar.page_title'),
    pageTitle: intl.get('payment_calendar.page_title'),
  },
  // Budgets
  {
    path: `/budgets`,
    component: lazy(() => import('@/containers/Budgets/BudgetsPage')),
    breadcrumb: intl.get('budgets.page_title'),
    pageTitle: intl.get('budgets.page_title'),
  },
  // Debts (Долги)
  {
    path: `/debts`,
    component: lazy(() => import('@/containers/Debts/DebtsPage')),
    breadcrumb: intl.get('debts.title'),
    pageTitle: intl.get('debts.title'),
  },
  // Payment Requests (Заявки на оплату)
  {
    path: `/payment-requests`,
    component: lazy(
      () => import('@/containers/PaymentRequests/PaymentRequestsPage'),
    ),
    breadcrumb: intl.get('payment_requests.page_title'),
    pageTitle: intl.get('payment_requests.page_title'),
  },
  // Deals (Сделки)
  {
    path: `/deals`,
    component: lazy(() => import('@/containers/Deals/DealsPage')),
    breadcrumb: intl.get('deals.page_title'),
    pageTitle: intl.get('deals.page_title'),
  },
  // Cost Allocation (Распределение расходов)
  {
    path: `/cost-allocation`,
    component: lazy(() => import('@/containers/CostAllocation/CostAllocationPage')),
    breadcrumb: intl.get('cost_allocation.page.title'),
    pageTitle: intl.get('cost_allocation.page.title'),
  },
  // Payroll (Зарплата)
  {
    path: `/payroll`,
    component: lazy(() => import('@/containers/Payroll/PayrollPage')),
    breadcrumb: intl.get('payroll.page_title'),
    pageTitle: intl.get('payroll.page_title'),
  },
  // Data quality (Качество данных)
  {
    path: `/data-quality`,
    component: lazy(() => import('@/containers/DataQuality/DataQualityPage')),
    breadcrumb: intl.get('data_quality.page_title'),
    pageTitle: intl.get('data_quality.page_title'),
  },
  // Dividends (Вывод средств собственнику)
  {
    path: `/dividends`,
    component: lazy(() => import('@/containers/Dividends/DividendsPage')),
    breadcrumb: intl.get('dividends.page_title'),
    pageTitle: intl.get('dividends.page_title'),
  },
  // Credits (Кредиты и займы)
  {
    path: `/credits`,
    component: lazy(() => import('@/containers/Credits/CreditsPage')),
    breadcrumb: intl.get('credits.page.title'),
    pageTitle: intl.get('credits.page.title'),
  },
  // Financial model (Финмодель)
  {
    path: `/financial-model`,
    component: lazy(() => import('@/containers/FinancialModel/FinancialModelPage')),
    breadcrumb: intl.get('financial_model.page.title'),
    pageTitle: intl.get('financial_model.page.title'),
  },
  // MoySklad integration (㉛)
  {
    path: `/moysklad`,
    component: lazy(() => import('@/containers/MoySklad/MoySkladPage')),
    breadcrumb: intl.get('moysklad.page.title'),
    pageTitle: intl.get('moysklad.page.title'),
  },
  // Marketplaces (⑱ WB/Ozon)
  {
    path: `/marketplaces`,
    component: lazy(() => import('@/containers/Marketplaces/MarketplacesPage')),
    breadcrumb: intl.get('marketplaces.page.title'),
    pageTitle: intl.get('marketplaces.page.title'),
  },
  // Bank API sync (⑨c Тинькофф/Альфа)
  {
    path: `/bank-api-sync`,
    component: lazy(() => import('@/containers/BankApiSync/BankApiSyncPage')),
    breadcrumb: intl.get('bank_api.page.title'),
    pageTitle: intl.get('bank_api.page.title'),
  },
  // 1C export (⑩ выгрузка)
  {
    path: `/onec-export`,
    component: lazy(() => import('@/containers/OnecExport/OnecExportPage')),
    breadcrumb: intl.get('onec_export.page.title'),
    pageTitle: intl.get('onec_export.page.title'),
  },
  // 1C import (⑩ импорт справочников CommerceML)
  {
    path: `/onec-import`,
    component: lazy(() => import('@/containers/OnecImport/OnecImportPage')),
    breadcrumb: intl.get('onec_import.page.title'),
    pageTitle: intl.get('onec_import.page.title'),
  },
  // Acquiring (⑨d YooKassa)
  {
    path: `/acquiring`,
    component: lazy(() => import('@/containers/Acquiring/AcquiringPage')),
    breadcrumb: intl.get('acquiring.page.title'),
    pageTitle: intl.get('acquiring.page.title'),
  },
  // Zenmoney import (⑨b Дзенмани)
  {
    path: `/zenmoney`,
    component: lazy(() => import('@/containers/Zenmoney/ZenmoneyPage')),
    breadcrumb: intl.get('zenmoney.page.title'),
    pageTitle: intl.get('zenmoney.page.title'),
  },
  // VAT analysis (㉖ Анализ НДС)
  {
    path: `/vat-analysis`,
    component: lazy(() => import('@/containers/VatAnalysis/VatAnalysisPage')),
    breadcrumb: intl.get('vat_analysis.page.title'),
    pageTitle: intl.get('vat_analysis.page.title'),
  },
  // Financial ratios (㉕ Показатели)
  {
    path: `/financial-ratios`,
    component: lazy(() => import('@/containers/FinancialRatios/FinancialRatiosPage')),
    breadcrumb: intl.get('financial_ratios.page.title'),
    pageTitle: intl.get('financial_ratios.page.title'),
  },
  // CRM-интеграция (⑯a Битрикс24)
  {
    path: `/crm-integration`,
    component: lazy(() => import('@/containers/CrmIntegration/CrmIntegrationPage')),
    breadcrumb: intl.get('crm_integration.page.title'),
    pageTitle: intl.get('crm_integration.page.title'),
  },
  // Fixed Assets (Основные средства и амортизация)
  {
    path: `/fixed-assets`,
    component: lazy(() => import('@/containers/FixedAssets/FixedAssetsPage')),
    breadcrumb: intl.get('fixed_assets.page.title'),
    pageTitle: intl.get('fixed_assets.page.title'),
  },
  // Notifications (Уведомления — настройки)
  {
    path: `/settings/notifications`,
    component: lazy(
      () =>
        import(
          '@/containers/Notifications/NotificationsSettingsPage'
        ),
    ),
    breadcrumb: intl.get('notifications.settings.title'),
    pageTitle: intl.get('notifications.settings.title'),
  },
  // Homepage
  {
    path: `/`,
    component: lazy(() => import('@/containers/Homepage/Homepage')),
    breadcrumb: intl.get('homepage'),
  },
];
