import { Knex } from 'knex';
import { Global, Module, Scope } from '@nestjs/common';
import { TENANCY_DB_CONNECTION } from '../TenancyDB/TenancyDB.constants';
import { Item } from '../../../modules/Items/models/Item';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ItemEntry } from '@/modules/TransactionItemEntry/models/ItemEntry';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { ExpenseCategory } from '@/modules/Expenses/models/ExpenseCategory.model';
import { ItemCategory } from '@/modules/ItemCategories/models/ItemCategory.model';
import { TaxRateModel } from '@/modules/TaxRates/models/TaxRate.model';
import { PdfTemplateModel } from '@/modules/PdfTemplate/models/PdfTemplate';
import { Warehouse } from '@/modules/Warehouses/models/Warehouse.model';
import { ItemWarehouseQuantity } from '@/modules/Warehouses/models/ItemWarehouseQuantity';
import { Branch } from '@/modules/Branches/models/Branch.model';
import { SaleEstimate } from '@/modules/SaleEstimates/models/SaleEstimate';
import { Customer } from '@/modules/Customers/models/Customer';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Document } from '@/modules/ChromiumlyTenancy/models/Document';
import { DocumentLink } from '@/modules/ChromiumlyTenancy/models/DocumentLink';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { Bill } from '@/modules/Bills/models/Bill';
import { BillPayment } from '@/modules/BillPayments/models/BillPayment';
import { BillPaymentEntry } from '@/modules/BillPayments/models/BillPaymentEntry';
import { BillLandedCostEntry } from '@/modules/BillLandedCosts/models/BillLandedCostEntry';
import { BillLandedCost } from '@/modules/BillLandedCosts/models/BillLandedCost';
import { VendorCreditAppliedBill } from '@/modules/VendorCreditsApplyBills/models/VendorCreditAppliedBill';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { PaymentIntegration } from '@/modules/StripePayment/models/PaymentIntegration.model';
import { PaymentReceivedEntry } from '@/modules/PaymentReceived/models/PaymentReceivedEntry';
import { CreditNoteAppliedInvoice } from '@/modules/CreditNotesApplyInvoice/models/CreditNoteAppliedInvoice';
import { CreditNote } from '@/modules/CreditNotes/models/CreditNote';
import { SaleReceipt } from '@/modules/SaleReceipts/models/SaleReceipt';
import { ManualJournal } from '@/modules/ManualJournals/models/ManualJournal';
import { ManualJournalEntry } from '@/modules/ManualJournals/models/ManualJournalEntry';
import { RefundCreditNote } from '@/modules/CreditNoteRefunds/models/RefundCreditNote';
import { VendorCredit } from '@/modules/VendorCredit/models/VendorCredit';
import { RefundVendorCredit } from '@/modules/VendorCreditsRefund/models/RefundVendorCredit';
import { PaymentReceived } from '@/modules/PaymentReceived/models/PaymentReceived';
import { Model } from 'objection';
import { ClsModule } from 'nestjs-cls';
import { TenantUser } from './models/TenantUser.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { Budget } from '@/modules/Budgets/models/Budget.model';
import { BudgetLine } from '@/modules/Budgets/models/BudgetLine.model';
import { DebtRepaymentPlan } from '@/modules/Debts/models/DebtRepaymentPlan.model';
import { DebtRepaymentInstallment } from '@/modules/Debts/models/DebtRepaymentInstallment.model';
import { PaymentRequest } from '@/modules/PaymentRequests/models/PaymentRequest.model';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { DealStage } from '@/modules/Deals/models/DealStage.model';
import { CostAllocationRule } from '@/modules/CostAllocation/models/CostAllocationRule.model';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { PayrollRun } from '@/modules/Payroll/models/PayrollRun.model';
import { PayrollRunLine } from '@/modules/Payroll/models/PayrollRunLine.model';
import { EmployeeKpiTarget } from '@/modules/Payroll/models/EmployeeKpiTarget.model';

const models = [
  Item,
  Account,
  ItemEntry,
  AccountTransaction,
  Expense,
  ExpenseCategory,
  ItemCategory,
  TaxRateModel,
  PdfTemplateModel,
  Warehouse,
  ItemWarehouseQuantity,
  Branch,
  SaleEstimate,
  Customer,
  Contact,
  Document,
  DocumentLink,
  Vendor,
  Bill,
  BillPayment,
  BillPaymentEntry,
  BillLandedCost,
  BillLandedCostEntry,
  VendorCreditAppliedBill,
  SaleInvoice,
  CreditNoteAppliedInvoice,
  CreditNote,
  RefundCreditNote,
  SaleReceipt,
  ManualJournal,
  ManualJournalEntry,
  VendorCredit,
  VendorCreditAppliedBill,
  RefundVendorCredit,
  PaymentIntegration,
  PaymentReceived,
  PaymentReceivedEntry,
  ManagementArticle,
  ManagementArticleAccount,
  PlannedOperation,
  Budget,
  BudgetLine,
  DebtRepaymentPlan,
  DebtRepaymentInstallment,
  PaymentRequest,
  Deal,
  DealStage,
  CostAllocationRule,
  Employee,
  PayrollRun,
  PayrollRunLine,
  EmployeeKpiTarget,
  TenantUser,
];

/**
 * Decorator factory that registers a model with the tenancy system.
 * @param model The model class to register
 */
export function RegisterTenancyModel(model: typeof Model) {
  return ClsModule.forFeatureAsync({
    provide: model.name,
    inject: [TENANCY_DB_CONNECTION],
    global: true,
    useFactory: (tenantKnex: () => Knex) => () => {
      return model.bindKnex(tenantKnex());
    },
    strict: true,
    type: 'function',
  });
}

// Register all models using the decorator
const modelProviders = models.map((model) => RegisterTenancyModel(model));

@Global()
@Module({
  imports: [...modelProviders],
  exports: [...modelProviders],
})
export class TenancyModelsModule { }
