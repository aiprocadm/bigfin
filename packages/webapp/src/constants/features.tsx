
export const Features = {
  Warehouses: 'warehouses',
  Branches: 'branches',
  ManualJournal: 'manualJournal',
  Projects: 'deals', // оживляет селектор сделки в формах операций под флагом deals
  BankSyncing: 'BankSyncing',
  AccrualPnl: 'accrual_pnl', // тумблер «кассовый/начисление» в ОПиУ (sub-project 29)
  Credits: 'credits', // кредиты и займы (ОС/погашение через installments)
  FixedAssets: 'fixed_assets',
  Notifications: 'notifications', // уведомления о кассовом разрыве/остатке/просрочке (㉒)
  InterfaceModes: 'interface_modes',
  FinancialModel: 'financial_model',
  BankStatementImport: 'bank_statement_import',
  VatAnalysis: 'vat_analysis', // ㉖ анализ НДС
  FinancialRatios: 'financial_ratios', // ㉕ финансовые коэффициенты («Показатели»)
  CrmIntegration: 'crm_integration', // CRM-интеграции (⑯a Битрикс24)
}