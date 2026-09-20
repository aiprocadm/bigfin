// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { AccountsModule } from '@/modules/Accounts/Accounts.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { SaleInvoiceGLEntries } from '@/modules/SaleInvoices/ledger/InvoiceGLEntries';
import { BillGLEntries } from '@/modules/Bills/commands/BillsGLEntries';
import { SaleReceiptGLEntries } from '@/modules/SaleReceipts/ledger/SaleReceiptGLEntries';
import { CreditNoteGLEntries } from '@/modules/CreditNotes/commands/CreditNoteGLEntries';
import { VendorCreditGLEntries } from '@/modules/VendorCredit/commands/VendorCreditGLEntries';
import { DataQualityController } from './DataQuality.controller';
import { DataQualityApplication } from './DataQuality.application';
import { GetUnmappedOperationsService } from './queries/GetUnmappedOperations.service';
import { GetPossibleDuplicatesService } from './queries/GetPossibleDuplicates.service';
import { GetPlCashflowComparisonService } from './queries/GetPlCashflowComparison.service';
import { GetUnbalancedJournalsService } from './queries/GetUnbalancedJournals.service';
import { GetFailedMailsService } from './queries/GetFailedMails.service';
import { GetDriftedBalancesService } from './queries/GetDriftedBalances.service';
import { RepostVatDocumentsService } from './commands/RepostVatDocuments.service';
import { GetCrookedCurrencyJournalsService } from './queries/GetCrookedCurrencyJournals.service';
import { RepostCrookedCurrencyJournalsService } from './commands/RepostCrookedCurrencyJournals.service';
import { ManualJournalGLEntries } from '@/modules/ManualJournals/commands/ManualJournalGLEntries';

@Module({
  // Записи журнала перепроводим тем же кодом, что и обычное сохранение
  // документа. Сами GL-сервисы объявлены здесь напрямую, а не через импорт
  // пяти модулей документов: им нужны только журнал, план счетов и модель,
  // а импорт целых модулей притащил бы очереди и подписчики без пользы.
  imports: [
    TenancyDatabaseModule,
    TenancyModule,
    LedgerModule,
    AccountsModule,
    // Модуль за флагом: контроллер обязан отвечать 403, когда он выключен.
    FeaturesModule,
  ],
  controllers: [DataQualityController],
  providers: [
    DataQualityApplication,
    GetUnmappedOperationsService,
    GetPossibleDuplicatesService,
    GetPlCashflowComparisonService,
    GetUnbalancedJournalsService,
    GetFailedMailsService,
    GetDriftedBalancesService,
    RepostVatDocumentsService,
    GetCrookedCurrencyJournalsService,
    RepostCrookedCurrencyJournalsService,
    ManualJournalGLEntries,
    SaleInvoiceGLEntries,
    BillGLEntries,
    SaleReceiptGLEntries,
    CreditNoteGLEntries,
    VendorCreditGLEntries,
  ],
})
export class DataQualityModule {}
