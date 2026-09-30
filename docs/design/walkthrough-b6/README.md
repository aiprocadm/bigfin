# Обход всех маршрутов — блок Б6 (UI-056-3 ТЗ-4)

Снято 147 маршрутов панели и настроек (из `routes/dashboard.tsx` и
`routes/preferences.tsx`; адреса с `:id` открыты с `1`) на локальной копии
витрины с демо-организацией, 30.09.2026.

По каждому маршруту проверено:
- **h1** — сколько на экране главных заголовков (правило ТЗ-4: ровно один);
- **прокрутка вбок** на телефоне 390 px (правило UI-053: её быть не должно);
- **ошибка страницы** — необработанная ошибка в браузере;
- куда экран увёл, если адрес сменился.

Снимки — ноутбук 1440×900 (`<маршрут>.jpg`); снимок телефона 390×844
сохраняется только для экрана с прокруткой вбок.

**Итог: 146 из 147 маршрутов без замечаний.**

## Замечания

| Маршрут | Ноутбук 1440 | Телефон 390 | Итог | Снимок |
|---|---|---|---|---|
| `/preferences/payment-methods/stripe/callback` | h1: 1, ошибка страницы | h1: 1, ошибка страницы | ⚠ | [снимок](preferences_payment-methods_stripe_callback.jpg) |

Разбор: `/preferences/payment-methods/stripe/callback` — страница возврата
из Stripe. Её открывает сам Stripe с параметрами подключения; открытая
вручную без них, она получает от сервера 400. Это ожидаемо и не починка.

Найдено и починено в этом же этапе (до снятия отчёта): на ~45 экранах не было
главного заголовка (заглушка режима «Бухгалтер», раздел настроек), на ~12 их
было два (крупная сумма формы, пустое состояние, название организации в шапке
отчёта, блоки закрытия периодов, свой заголовок раздела настроек поверх
заголовка шапки настроек).

## Все маршруты

| Маршрут | Ноутбук 1440 | Телефон 390 | Итог | Снимок |
|---|---|---|---|---|
| `/accounts/import` | h1: 1 | h1: 1 | ✔ | [снимок](accounts_import.jpg) |
| `/accounts` | h1: 1 | h1: 1 | ✔ | [снимок](accounts.jpg) |
| `/make-journal-entry` | h1: 1 | h1: 1 | ✔ | [снимок](make-journal-entry.jpg) |
| `/manual-journals/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](manual-journals_1_edit.jpg) |
| `/manual-journals/import` | h1: 1 | h1: 1 | ✔ | [снимок](manual-journals_import.jpg) |
| `/manual-journals` | h1: 1 | h1: 1 | ✔ | [снимок](manual-journals.jpg) |
| `/item/categories/import` | h1: 1 | h1: 1 | ✔ | [снимок](item_categories_import.jpg) |
| `/items/categories` | h1: 1 | h1: 1 | ✔ | [снимок](items_categories.jpg) |
| `/items/import` | h1: 1 | h1: 1 | ✔ | [снимок](items_import.jpg) |
| `/items/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](items_1_edit.jpg) |
| `/items/new` | h1: 1 | h1: 1 | ✔ | [снимок](items_new.jpg) |
| `/items` | h1: 1 | h1: 1 | ✔ | [снимок](items.jpg) |
| `/inventory-adjustments` | h1: 1 | h1: 1 | ✔ | [снимок](inventory-adjustments.jpg) |
| `/warehouses-transfers/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](warehouses-transfers_1_edit.jpg) |
| `/warehouses-transfers/new` | h1: 1 | h1: 1 | ✔ | [снимок](warehouses-transfers_new.jpg) |
| `/warehouses-transfers` | h1: 1 | h1: 1 | ✔ | [снимок](warehouses-transfers.jpg) |
| `/financial-reports/general-ledger` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_general-ledger.jpg) |
| `/financial-reports/balance-sheet` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_balance-sheet.jpg) |
| `/financial-reports/trial-balance-sheet` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_trial-balance-sheet.jpg) |
| `/financial-reports/profit-loss-sheet` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_profit-loss-sheet.jpg) |
| `/financial-reports/receivable-aging-summary` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_receivable-aging-summary.jpg) |
| `/financial-reports/payable-aging-summary` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_payable-aging-summary.jpg) |
| `/financial-reports/journal-sheet` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_journal-sheet.jpg) |
| `/financial-reports/purchases-by-items` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_purchases-by-items.jpg) |
| `/financial-reports/sales-by-items` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_sales-by-items.jpg) |
| `/financial-reports/inventory-valuation` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_inventory-valuation.jpg) |
| `/financial-reports/customers-balance-summary` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_customers-balance-summary.jpg) |
| `/financial-reports/vendors-balance-summary` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_vendors-balance-summary.jpg) |
| `/financial-reports/transactions-by-customers` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_transactions-by-customers.jpg) |
| `/financial-reports/transactions-by-vendors` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_transactions-by-vendors.jpg) |
| `/financial-reports/cash-flow-articles` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_cash-flow-articles.jpg) |
| `/financial-reports/cash-flow` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_cash-flow.jpg) |
| `/financial-reports/inventory-item-details` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_inventory-item-details.jpg) |
| `/financial-reports/sales-tax-liability-summary` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_sales-tax-liability-summary.jpg) |
| `/financial-reports/audit-log` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports_audit-log.jpg) |
| `/financial-reports` | h1: 1 | h1: 1 | ✔ | [снимок](financial-reports.jpg) |
| `/expenses/import` | h1: 1 | h1: 1 | ✔ | [снимок](expenses_import.jpg) |
| `/expenses/new` | h1: 1 | h1: 1 | ✔ | [снимок](expenses_new.jpg) |
| `/expenses/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](expenses_1_edit.jpg) |
| `/expenses` | h1: 1 | h1: 1 | ✔ | [снимок](expenses.jpg) |
| `/customers/import` | h1: 1 | h1: 1 | ✔ | [снимок](customers_import.jpg) |
| `/customers/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](customers_1_edit.jpg) |
| `/customers/new` | h1: 1 | h1: 1 | ✔ | [снимок](customers_new.jpg) |
| `/customers` | h1: 1 | h1: 1 | ✔ | [снимок](customers.jpg) |
| `/vendors/import` | h1: 1 | h1: 1 | ✔ | [снимок](vendors_import.jpg) |
| `/vendors/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](vendors_1_edit.jpg) |
| `/vendors/new` | h1: 1 | h1: 1 | ✔ | [снимок](vendors_new.jpg) |
| `/vendors` | h1: 1 | h1: 1 | ✔ | [снимок](vendors.jpg) |
| `/estimates/import` | h1: 1 | h1: 1 | ✔ | [снимок](estimates_import.jpg) |
| `/estimates/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](estimates_1_edit.jpg) |
| `/estimates/new` | h1: 1 | h1: 1 | ✔ | [снимок](estimates_new.jpg) |
| `/estimates` | h1: 1 | h1: 1 | ✔ | [снимок](estimates.jpg) |
| `/invoices/import` | h1: 1 | h1: 1 | ✔ | [снимок](invoices_import.jpg) |
| `/invoices/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](invoices_1_edit.jpg) |
| `/invoices/new` | h1: 1 | h1: 1 | ✔ | [снимок](invoices_new.jpg) |
| `/invoices` | h1: 1 | h1: 1 | ✔ | [снимок](invoices.jpg) |
| `/receipts/import` | h1: 1 | h1: 1 | ✔ | [снимок](receipts_import.jpg) |
| `/receipts/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](receipts_1_edit.jpg) |
| `/receipts/new` | h1: 1 | h1: 1 | ✔ | [снимок](receipts_new.jpg) |
| `/receipts` | h1: 1 | h1: 1 | ✔ | [снимок](receipts.jpg) |
| `/credit-notes/import` | h1: 1 | h1: 1 | ✔ | [снимок](credit-notes_import.jpg) |
| `/credit-notes/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](credit-notes_1_edit.jpg) |
| `/credit-notes/new` | h1: 1 | h1: 1 | ✔ | [снимок](credit-notes_new.jpg) |
| `/credit-notes` | h1: 1 | h1: 1 | ✔ | [снимок](credit-notes.jpg) |
| `/payments-received/import` | h1: 1 | h1: 1 | ✔ | [снимок](payments-received_import.jpg) |
| `/payments-received/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](payments-received_1_edit.jpg) |
| `/payment-received/new` | h1: 1 | h1: 1 | ✔ | [снимок](payment-received_new.jpg) |
| `/payments-received` | h1: 1 | h1: 1 | ✔ | [снимок](payments-received.jpg) |
| `/bills/import` | h1: 1 | h1: 1 | ✔ | [снимок](bills_import.jpg) |
| `/bills/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](bills_1_edit.jpg) |
| `/bills/new` | h1: 1 | h1: 1 | ✔ | [снимок](bills_new.jpg) |
| `/bills` | h1: 1 | h1: 1 | ✔ | [снимок](bills.jpg) |
| `/vendor-credits/import` | h1: 1 | h1: 1 | ✔ | [снимок](vendor-credits_import.jpg) |
| `/vendor-credits/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](vendor-credits_1_edit.jpg) |
| `/vendor-credits/new` | h1: 1 | h1: 1 | ✔ | [снимок](vendor-credits_new.jpg) |
| `/vendor-credits` | h1: 1 | h1: 1 | ✔ | [снимок](vendor-credits.jpg) |
| `/payments-made/import` | h1: 1 | h1: 1 | ✔ | [снимок](payments-made_import.jpg) |
| `/payments-made/1/edit` | h1: 1 | h1: 1 | ✔ | [снимок](payments-made_1_edit.jpg) |
| `/payments-made/new` | h1: 1 | h1: 1 | ✔ | [снимок](payments-made_new.jpg) |
| `/payments-made` | h1: 1 | h1: 1 | ✔ | [снимок](payments-made.jpg) |
| `/cashflow-accounts/transactions` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts_transactions.jpg) |
| `/cashflow-accounts/trash` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts_trash.jpg) |
| `/cashflow-accounts/imports` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts_imports.jpg) |
| `/cashflow-accounts/reconciliation` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts_reconciliation.jpg) |
| `/cashflow-accounts/1/transactions` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts_1_transactions.jpg) |
| `/cashflow-accounts/1/import` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts_1_import.jpg) |
| `/cashflow-accounts` | h1: 1 | h1: 1 | ✔ | [снимок](cashflow-accounts.jpg) |
| `/transactions-locking` | h1: 1 | h1: 1 | ✔ | [снимок](transactions-locking.jpg) |
| `/tax-rates/import` | h1: 1 | h1: 1 | ✔ | [снимок](tax-rates_import.jpg) |
| `/tax-rates` | h1: 1 | h1: 1 | ✔ | [снимок](tax-rates.jpg) |
| `/bank-rules` | h1: 1 | h1: 1 | ✔ | [снимок](bank-rules.jpg) |
| `/management-articles` | h1: 1 | h1: 1 | ✔ | [снимок](management-articles.jpg) |
| `/payment-calendar` | h1: 1 | h1: 1 | ✔ | [снимок](payment-calendar.jpg) |
| `/budgets` | h1: 1 | h1: 1 | ✔ | [снимок](budgets.jpg) |
| `/debts` | h1: 1 | h1: 1 | ✔ | [снимок](debts.jpg) |
| `/payment-requests` | h1: 1 | h1: 1 | ✔ | [снимок](payment-requests.jpg) |
| `/deals` | h1: 1 | h1: 1 | ✔ | [снимок](deals.jpg) |
| `/cost-allocation` | h1: 1 | h1: 1 | ✔ | [снимок](cost-allocation.jpg) |
| `/payroll` | h1: 1 | h1: 1 | ✔ | [снимок](payroll.jpg) |
| `/data-quality` | h1: 1 | h1: 1 | ✔ | [снимок](data-quality.jpg) |
| `/dividends` | h1: 1 | h1: 1 | ✔ | [снимок](dividends.jpg) |
| `/credits` | h1: 1 | h1: 1 | ✔ | [снимок](credits.jpg) |
| `/legal-entities` | h1: 1 | h1: 1 | ✔ | [снимок](legal-entities.jpg) |
| `/directions` | h1: 1 | h1: 1 | ✔ | [снимок](directions.jpg) |
| `/expenses-analysis` | h1: 1 | h1: 1 | ✔ | [снимок](expenses-analysis.jpg) |
| `/capitalization` | h1: 1 | h1: 1 | ✔ | [снимок](capitalization.jpg) |
| `/ai-chat` | h1: 1 | h1: 1 | ✔ | [снимок](ai-chat.jpg) |
| `/financial-model` | h1: 1 | h1: 1 | ✔ | [снимок](financial-model.jpg) |
| `/moysklad` | h1: 1 | h1: 1 | ✔ | [снимок](moysklad.jpg) |
| `/marketplaces` | h1: 1 | h1: 1 | ✔ | [снимок](marketplaces.jpg) |
| `/bank-api-sync` | h1: 1 | h1: 1 | ✔ | [снимок](bank-api-sync.jpg) |
| `/onec-export` | h1: 1 | h1: 1 | ✔ | [снимок](onec-export.jpg) |
| `/onec-import` | h1: 1 | h1: 1 | ✔ | [снимок](onec-import.jpg) |
| `/acquiring` | h1: 1 | h1: 1 | ✔ | [снимок](acquiring.jpg) |
| `/zenmoney` | h1: 1 | h1: 1 | ✔ | [снимок](zenmoney.jpg) |
| `/vat-analysis` | h1: 1 | h1: 1 | ✔ | [снимок](vat-analysis.jpg) |
| `/financial-ratios` | h1: 1 | h1: 1 | ✔ | [снимок](financial-ratios.jpg) |
| `/crm-integration` | h1: 1 | h1: 1 | ✔ | [снимок](crm-integration.jpg) |
| `/fixed-assets` | h1: 1 | h1: 1 | ✔ | [снимок](fixed-assets.jpg) |
| `/settings/notifications` | h1: 1 | h1: 1 | ✔ | [снимок](settings_notifications.jpg) |
| `/` | h1: 1 | h1: 1 | ✔ | [снимок](home.jpg) |
| `/preferences/general` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_general.jpg) |
| `/preferences/branding` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_branding.jpg) |
| `/preferences/users` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_users.jpg) |
| `/preferences/security` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_security.jpg) |
| `/preferences/invoices` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_invoices.jpg) |
| `/preferences/payment-methods` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_payment-methods.jpg) |
| `/preferences/payment-methods/stripe/callback` | h1: 1, ошибка страницы | h1: 1, ошибка страницы | ⚠ | [снимок](preferences_payment-methods_stripe_callback.jpg) |
| `/preferences/credit-notes` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_credit-notes.jpg) |
| `/preferences/estimates` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_estimates.jpg) |
| `/preferences/receipts` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_receipts.jpg) |
| `/preferences/roles` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_roles.jpg) |
| `/preferences/roles/1` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_roles_1.jpg) |
| `/preferences/currencies` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_currencies.jpg) |
| `/preferences/warehouses` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_warehouses.jpg) |
| `/preferences/branches` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_branches.jpg) |
| `/preferences/accountant` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_accountant.jpg) |
| `/preferences/items` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_items.jpg) |
| `/preferences/api-keys` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_api-keys.jpg) |
| `/preferences/ai-analyst` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_ai-analyst.jpg) |
| `/preferences/public-api` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_public-api.jpg) |
| `/preferences/interface-mode` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_interface-mode.jpg) |
| `/preferences/modules` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_modules.jpg) |
| `/preferences/display` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_display.jpg) |
| `/preferences/account-groups` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_account-groups.jpg) |
| `/preferences/export-data` | h1: 1 | h1: 1 | ✔ | [снимок](preferences_export-data.jpg) |
| `/preferences/` | h1: 1, → /preferences/general | h1: 1, → /preferences/general | ✔ | [снимок](preferences_.jpg) |
