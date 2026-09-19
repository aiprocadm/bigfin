import { Module } from '@nestjs/common';
import { PurchasesByItemsModule } from './modules/PurchasesByItems/PurchasesByItems.module';
import { CustomerBalanceSummaryModule } from './modules/CustomerBalanceSummary/CustomerBalanceSummary.module';
import { SalesByItemsModule } from './modules/SalesByItems/SalesByItems.module';
import { GeneralLedgerModule } from './modules/GeneralLedger/GeneralLedger.module';
import { TrialBalanceSheetModule } from './modules/TrialBalanceSheet/TrialBalanceSheet.module';
import { TransactionsByVendorModule } from './modules/TransactionsByVendor/TransactionsByVendor.module';
import { TransactionsByCustomerModule } from './modules/TransactionsByCustomer/TransactionsByCustomer.module';
import { TransactionsByReferenceModule } from './modules/TransactionsByReference/TransactionByReference.module';
import { ARAgingSummaryModule } from './modules/ARAgingSummary/ARAgingSummary.module';
import { APAgingSummaryModule } from './modules/APAgingSummary/APAgingSummary.module';
import { InventoryItemDetailsModule } from './modules/InventoryItemDetails/InventoryItemDetails.module';
import { InventoryValuationSheetModule } from './modules/InventoryValuationSheet/InventoryValuationSheet.module';
import { SalesTaxLiabilityModule } from './modules/SalesTaxLiabilitySummary/SalesTaxLiability.module';
import { JournalSheetModule } from './modules/JournalSheet/JournalSheet.module';
import { ProfitLossSheetModule } from './modules/ProfitLossSheet/ProfitLossSheet.module';
import { CashflowStatementModule } from './modules/CashFlowStatement/CashflowStatement.module';
import { VendorBalanceSummaryModule } from './modules/VendorBalanceSummary/VendorBalanceSummary.module';
import { BalanceSheetModule } from './modules/BalanceSheet/BalanceSheet.module';
import { GetReportChartService } from './queries/GetReportChart.service';
import { GetBalanceStructureService } from './queries/GetBalanceStructure.service';
import { GetReportDrillDownService } from './queries/GetReportDrillDown.service';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { ReportChartController } from './queries/ReportChart.controller';
import { GetReportPlanFactService } from './queries/GetReportPlanFact.service';
import { ReportPlanFactController } from './queries/ReportPlanFact.controller';

@Module({
  imports: [
    BalanceSheetModule,
    PurchasesByItemsModule,
    CustomerBalanceSummaryModule,
    VendorBalanceSummaryModule,
    SalesByItemsModule,
    GeneralLedgerModule,
    TrialBalanceSheetModule,
    TransactionsByVendorModule,
    TransactionsByCustomerModule,
    TransactionsByReferenceModule,
    ARAgingSummaryModule,
    APAgingSummaryModule,
    InventoryItemDetailsModule,
    InventoryValuationSheetModule,
    SalesTaxLiabilityModule,
    JournalSheetModule,
    ProfitLossSheetModule,
    CashflowStatementModule,
  ],
  // График над таблицей отчёта (п. 4.2 ТЗ): считает те же числа, что таблица.
  // TenancyContext нужен раскрытию суммы: без него сервер не поднимется —
  // это и стережёт `tenancyModuleImports.spec.ts`.
  providers: [
    GetReportChartService,
    GetBalanceStructureService,
    GetReportDrillDownService,
    GetReportPlanFactService,
    TenancyContext,
  ],
  controllers: [ReportChartController, ReportPlanFactController],
})
export class FinancialStatementsModule {}
