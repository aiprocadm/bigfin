
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
  Moysklad: 'moysklad', // ㉛ интеграция МойСклад
  Marketplaces: 'marketplaces', // ⑱ маркетплейсы WB/Ozon
  BankApiSync: 'bank_api_sync', // ⑨c банковские API (Тинькофф/Альфа)
  OnecExport: 'onec_export', // ⑩ выгрузка в 1С (1CClientBankExchange)
  TelegramQuickEntry: 'telegram_quick_entry', // ㉓ ввод операций через Telegram
  OnecImport: 'onec_import', // ⑩ импорт справочников из 1С (CommerceML)
  Acquiring: 'acquiring', // ⑨d эквайринг (YooKassa)
  Zenmoney: 'zenmoney_import', // ⑨b импорт Дзенмани
  VatAnalysis: 'vat_analysis', // ㉖ анализ НДС
  RuPrintForms: 'ru_print_forms', // ②c печатные формы РФ (счёт на оплату и др.)
  FinancialRatios: 'financial_ratios', // ㉕ финансовые коэффициенты («Показатели»)
  DataQuality: 'data_quality', // ㉗ качество данных (без статьи/дубли/ОПиУ↔ДДС)
  CrmIntegration: 'crm_integration', // CRM-интеграции (⑯a Битрикс24)
}