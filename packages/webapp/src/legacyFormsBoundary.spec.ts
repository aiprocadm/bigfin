import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Старая библиотека форм: список закрыт, он может только уменьшаться.
 *
 * РЕШЕНИЕ, А НЕ НЕДОДЕЛКА. Форм на старой библиотеке 67 — не 277, как
 * считалось: 277 файлов её ВВОЗЯТ, но 209 из них — поля, ячейки и
 * помощники, а настоящих форм (там, где есть `<Formik` или `useFormik`)
 * ровно 67.
 *
 * Массово переводить их НЕ НАДО, и вот почему:
 *
 * 1. Человек не увидит РАЗНИЦЫ. Внешне формы уже переработаны — мостом
 *    темы. Перевод сменил бы внутреннюю деталь, не изменив ни одного
 *    экрана.
 * 2. Это самое опасное место продукта. Формы — это ввод денег. Ошибка
 *    здесь даёт неверные числа в учёте, а не кривую кнопку.
 * 3. ТЗ само так решило (§5.1): «Не переписывать 667 файлов… Всё, что ниже
 *    в списке и не тронуто, остаётся на Blueprint до отдельного решения.»
 *
 * ЧТО ДЕЛАЕТ ЭТОТ СТОРОЖ. Держит границу: новые формы пишутся на новой
 * библиотеке (React Hook Form + Zod), как `ResetPasswordPage`. Список
 * старых может только сокращаться — и не может протухнуть: если форму
 * перевели, а строку забыли убрать, сторож скажет об этом сам.
 */
const ROOT = path.resolve(__dirname);

/** Формы на старой библиотеке. Список ЗАКРЫТ: добавлять сюда нельзя. */
const LEGACY_FORMS = [
  'components/AdvancedFilter/AdvancedFilterDropdown.tsx',
  'components/NumberFormatDropdown/index.tsx',
  'containers/Accounting/MakeJournal/MakeJournalEntriesForm.tsx',
  'containers/Banking/Rules/RuleFormDialog/RuleFormContentForm.tsx',
  'containers/CashFlow/AccountTransactions/AccountTransactionsDateFilter.tsx',
  'containers/CashFlow/AccountTransactions/dialogs/DisconnectBankAccountDialog/DisconnectBankAccountDialogContent.tsx',
  'containers/CashFlow/CategorizeTransactionAside/MatchingReconcileTransactionAside/MatchingReconcileTransactionForm.tsx',
  'containers/CashFlow/CategorizeTransactionAside/MatchingTransaction.tsx',
  'containers/Customers/CustomerForm/CustomerFormFormik.tsx',
  'containers/Dialogs/AccountDialog/AccountDialogForm.tsx',
  'containers/Dialogs/AllocateLandedCostDialog/AllocateLandedCostForm.tsx',
  'containers/Dialogs/ApiKeysGenerateDialog/ApiKeysGenerateDialogContent.tsx',
  'containers/Dialogs/BadDebtDialog/BadDebtForm.tsx',
  'containers/Dialogs/BranchActivateDialog/BranchActivateForm.tsx',
  'containers/Dialogs/CustomerOpeningBalanceDialog/CustomerOpeningBalanceForm.tsx',
  'containers/Dialogs/ExportDialog/ExportDialogForm.tsx',
  'containers/Dialogs/InventoryAdjustmentFormDialog/InventoryAdjustmentForm.tsx',
  'containers/Dialogs/LockingTransactionsDialog/LockingTransactionsForm.tsx',
  'containers/Dialogs/QuickPaymentMadeFormDialog/QuickPaymentMadeForm.tsx',
  'containers/Dialogs/QuickPaymentReceiveFormDialog/QuickPaymentReceiveForm.tsx',
  'containers/Dialogs/ReconcileCreditNoteDialog/ReconcileCreditNoteForm.tsx',
  'containers/Dialogs/ReconcileVendorCreditDialog/ReconcileVendorCreditForm.tsx',
  'containers/Dialogs/RefundCreditNoteDialog/RefundCreditNoteForm.tsx',
  'containers/Dialogs/RefundVendorCreditDialog/RefundVendorCreditForm.tsx',
  'containers/Dialogs/UnlockingPartialTransactionsDialog/UnlockingPartialTransactionsForm.tsx',
  'containers/Dialogs/UnlockingTransactionsDialog/UnlockingTransactionsForm.tsx',
  'containers/Dialogs/VendorOpeningBalanceDialog/VendorOpeningBalanceForm.tsx',
  'containers/Dialogs/WarehouseActivateDialog/WarehouseActivateForm.tsx',
  'containers/ElementCustomize/ElementCustomizerForm.tsx',
  'containers/Expenses/ExpenseForm/ExpenseForm.tsx',
  'containers/FinancialStatements/AuditLog/AuditLogHeader.tsx',
  'containers/FinancialStatements/CustomersTransactions/CustomersTransactionsHeader.tsx',
  'containers/FinancialStatements/InventoryItemDetails/InventoryItemDetailsHeader.tsx',
  'containers/FinancialStatements/SalesTaxLiabilitySummary/SalesTaxLiabilitySummaryHeader.tsx',
  'containers/FinancialStatements/VendorsTransactions/VendorsTransactionsHeader.tsx',
  'containers/Import/ImportFileMappingForm.tsx',
  'containers/Import/ImportFileUploadForm.tsx',
  'containers/Items/ItemFormFormik.tsx',
  'containers/JournalNumber/ReferenceNumberForm.tsx',
  'containers/PaymentLink/dialogs/SelectPaymentMethodsDialog/SelectPaymemtMethodsForm.tsx',
  'containers/PaymentLink/dialogs/SharePaymentLinkDialog/SharePaymentLinkForm.tsx',
  'containers/Preferences/PaymentMethods/drawers/StripeIntegrationEditForm.tsx',
  'containers/Preferences/Users/Roles/RolesForm/RoleFormObserver.tsx',
  'containers/Preferences/Users/Roles/RolesForm/RolesForm.tsx',
  'containers/Projects/containers/EstimatedExpenseFormDialog/EstimatedExpenseForm.tsx',
  'containers/Projects/containers/ProjectBillableEntriesFormDialog/ProjectBillableEntriesForm.tsx',
  'containers/Projects/containers/ProjectExpenseForm/ProjectExpenseForm.tsx',
  'containers/Projects/containers/ProjectFormDialog/ProjectForm.tsx',
  'containers/Projects/containers/ProjectInvoicingFormDialog/ProjectInvoicingForm.tsx',
  'containers/Projects/containers/ProjectTaskFormDialog/ProjectTaskForm.tsx',
  'containers/Projects/containers/ProjectTimeEntryFormDialog/ProjectTimeEntryForm.tsx',
  'containers/Purchases/CreditNotes/CreditNoteForm/VendorCreditNoteForm.tsx',
  'containers/Purchases/PaymentsMade/PaymentForm/PaymentMadeForm.tsx',
  'containers/Purchases/PaymentsMade/PaymentForm/dialogs/PaymentMadeExcessDialog/PaymentMadeExcessDialogContent.tsx',
  'containers/Sales/CreditNotes/CreditNoteForm/CreditNoteForm.tsx',
  'containers/Sales/CreditNotes/CreditNoteSendMailDrawer/CreditNoteSendMailForm.tsx',
  'containers/Sales/Estimates/EstimateSendMailDrawer/EstimateSendMailForm.tsx',
  'containers/Sales/Invoices/InvoiceSendMailDrawer/InvoiceSendMailForm.tsx',
  'containers/Sales/PaymentsReceived/PaymentReceiveForm/PaymentReceiveForm.tsx',
  'containers/Sales/PaymentsReceived/PaymentReceiveForm/dialogs/ExcessPaymentDialog/ExcessPaymentDialogContent.tsx',
  'containers/Sales/PaymentsReceived/PaymentReceivedMailDrawer/PaymentReceivedMailForm.tsx',
  'containers/Sales/Receipts/ReceiptSendMailDrawer/ReceiptSendMailForm.tsx',
  'containers/Setup/SetupOrganizationPage.tsx',
  'containers/TaxRates/dialogs/TaxRateFormDialog/TaxRateFormDialogForm.tsx',
  'containers/Vendors/VendorForm/VendorFormFormik.tsx',
  'containers/WarehouseTransfers/WarehouseTransferForm/WarehouseTransferForm.tsx',
  'ee/workspaces/containers/CreateWorkspaceDrawer/CreateWorkspaceForm.tsx',
];

/** Настоящая форма — та, где создаётся сама форма, а не поле или ячейка. */
function isLegacyForm(source: string): boolean {
  if (!source.includes("from 'formik'")) return false;

  return source.includes('<Formik') || source.includes('useFormik(');
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full, acc);
    if (!/\.tsx?$/.test(entry.name)) return;
    if (/\.spec\.tsx?$/.test(entry.name)) return;

    acc.push(full);
  });

  return acc;
}

const found = sourceFiles(ROOT)
  .filter((file) => isLegacyForm(fs.readFileSync(file, 'utf8')))
  .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
  .sort();

describe('граница старой библиотеки форм', () => {
  it('новых форм на старой библиотеке не появилось', () => {
    const added = found.filter((file) => !LEGACY_FORMS.includes(file));

    expect(added).toEqual([]);
  });

  it('список не протух: переведённая форма вычёркивается', () => {
    // Список исключений надо проверять В ОБЕ СТОРОНЫ. Строка, которая
    // говорит «эта форма старая» про уже переведённую, — такая же неправда,
    // как пропущенная новая.
    const healed = LEGACY_FORMS.filter((file) => !found.includes(file));

    expect(healed).toEqual([]);
  });

  it('список может только уменьшаться', () => {
    expect(found.length).toBeLessThanOrEqual(LEGACY_FORMS.length);
  });

  it('поля и помощники формой не считаются', () => {
    // Иначе в список попали бы 209 файлов полей, и «долг» вырос бы вчетверо
    // на ровном месте.
    expect(isLegacyForm("import { useField } from 'formik';")).toBe(false);
    expect(isLegacyForm("import { Formik } from 'formik';\n<Formik>")).toBe(
      true,
    );
  });
});
