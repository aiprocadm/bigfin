// © 2026 Bigfin
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { SaleReceipt } from '@/modules/SaleReceipts/models/SaleReceipt';
import { CreditNote } from '@/modules/CreditNotes/models/CreditNote';
import { VendorCredit } from '@/modules/VendorCredit/models/VendorCredit';
import { SaleInvoiceGLEntries } from '@/modules/SaleInvoices/ledger/InvoiceGLEntries';
import { BillGLEntries } from '@/modules/Bills/commands/BillsGLEntries';
import { SaleReceiptGLEntries } from '@/modules/SaleReceipts/ledger/SaleReceiptGLEntries';
import { CreditNoteGLEntries } from '@/modules/CreditNotes/commands/CreditNoteGLEntries';
import { VendorCreditGLEntries } from '@/modules/VendorCredit/commands/VendorCreditGLEntries';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import { planVatRepost, RepostDocumentRow } from '../utils/planVatRepost';

/** Итог перепроведения по одному типу документов. */
export interface RepostTypeResult {
  documentType: string;
  /** Сколько документов взято в работу (проведённые и с налогом). */
  candidates: number;
  /** У скольких пересчитана сумма налога самого документа. */
  taxUpdated: number;
  /** Сколько документов успешно перепроведено. */
  reposted: number;
  /** Сколько не удалось перепровести (документ пропущен, остальные — нет). */
  failed: number;
  /** Пропущено черновиков. */
  skippedNotPosted: number;
  /** Пропущено документов без налога. */
  skippedNoTax: number;
}

export interface RepostResult {
  results: RepostTypeResult[];
  totalReposted: number;
  totalTaxUpdated: number;
  totalFailed: number;
}

/**
 * Перепроведение документов с НДС — шаг Д2 карты v6.
 *
 * Правки #188–#192 научили пять типов документов правильно считать налог, но
 * уже записанные документы остались с прежними — неверными — проводками:
 * журнал переписывается только при сохранении документа. Эта операция
 * пересчитывает сумму налога документа из его позиций и переписывает проводки
 * тем же кодом, каким это делает обычное сохранение.
 *
 * Свойства, важные для безопасности:
 * - черновики не трогаются (см. planVatRepost) — иначе в журнале появились бы
 *   записи, которых там никогда не было;
 * - берутся только документы с налоговой ставкой в позициях;
 * - операция идемпотентна: повторный запуск на уже исправленных документах
 *   переписывает те же самые проводки;
 * - сбой на одном документе не отменяет остальные, а попадает в отчёт.
 */
@Injectable()
export class RepostVatDocumentsService {
  private readonly logger = new Logger(RepostVatDocumentsService.name);

  constructor(
    private readonly uow: UnitOfWork,
    private readonly invoiceGL: SaleInvoiceGLEntries,
    private readonly billGL: BillGLEntries,
    private readonly receiptGL: SaleReceiptGLEntries,
    private readonly creditNoteGL: CreditNoteGLEntries,
    private readonly vendorCreditGL: VendorCreditGLEntries,

    @Inject(SaleInvoice.name)
    private readonly invoiceModel: TenantModelProxy<typeof SaleInvoice>,
    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,
    @Inject(SaleReceipt.name)
    private readonly receiptModel: TenantModelProxy<typeof SaleReceipt>,
    @Inject(CreditNote.name)
    private readonly creditNoteModel: TenantModelProxy<typeof CreditNote>,
    @Inject(VendorCredit.name)
    private readonly vendorCreditModel: TenantModelProxy<typeof VendorCredit>,
  ) {}

  public async repost(query: DataQualityQueryDto): Promise<RepostResult> {
    const results: RepostTypeResult[] = [];

    // Типы идут по очереди, а не параллельно: перепроведение пишет в журнал,
    // и одновременные транзакции по одной базе только мешают друг другу.
    results.push(
      await this.repostType({
        documentType: 'SaleInvoice',
        model: () => this.invoiceModel(),
        dateColumn: 'invoiceDate',
        postedColumn: 'deliveredAt',
        query,
        rewrite: (id, trx) => this.invoiceGL.rewritesInvoiceGLEntries(id, trx),
      }),
    );
    results.push(
      await this.repostType({
        documentType: 'Bill',
        model: () => this.billModel(),
        dateColumn: 'billDate',
        postedColumn: 'openedAt',
        query,
        rewrite: (id, trx) => this.billGL.rewriteBillGLEntries(id, trx),
      }),
    );
    results.push(
      await this.repostType({
        documentType: 'SaleReceipt',
        model: () => this.receiptModel(),
        dateColumn: 'receiptDate',
        postedColumn: 'closedAt',
        query,
        rewrite: (id, trx) => this.receiptGL.rewriteReceiptGLEntries(id, trx),
      }),
    );
    results.push(
      await this.repostType({
        documentType: 'CreditNote',
        model: () => this.creditNoteModel(),
        dateColumn: 'creditNoteDate',
        postedColumn: 'openedAt',
        query,
        rewrite: (id, trx) =>
          this.creditNoteGL.editVendorCreditGLEntries(id, trx),
      }),
    );
    results.push(
      await this.repostType({
        documentType: 'VendorCredit',
        model: () => this.vendorCreditModel(),
        dateColumn: 'vendorCreditDate',
        postedColumn: 'openedAt',
        query,
        rewrite: (id, trx) =>
          this.vendorCreditGL.rewriteVendorCreditGLEntries(id, trx),
      }),
    );

    return {
      results,
      totalReposted: results.reduce((sum, r) => sum + r.reposted, 0),
      totalTaxUpdated: results.reduce((sum, r) => sum + r.taxUpdated, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    };
  }

  /** Перепроводит документы одного типа. */
  private async repostType(params: {
    documentType: string;
    model: () => any;
    dateColumn: string;
    postedColumn: string;
    query: DataQualityQueryDto;
    rewrite: (id: number, trx?: Knex.Transaction) => Promise<void>;
  }): Promise<RepostTypeResult> {
    const { documentType, model, dateColumn, postedColumn, query, rewrite } =
      params;

    const documents = await model()
      .query()
      .withGraphFetched('entries')
      .onBuild((qb: any) => {
        if (query.fromDate) qb.where(dateColumn, '>=', query.fromDate);
        if (query.toDate) qb.where(dateColumn, '<=', query.toDate);
      });

    const rows: RepostDocumentRow[] = documents.map((document: any) => ({
      id: document.id,
      isPosted: Boolean(document[postedColumn]),
      taxAmountWithheld: document.taxAmountWithheld,
      entries: document.entries ?? [],
    }));
    const plan = planVatRepost(rows);

    const result: RepostTypeResult = {
      documentType,
      candidates: plan.items.length,
      taxUpdated: 0,
      reposted: 0,
      failed: 0,
      skippedNotPosted: plan.skippedNotPosted,
      skippedNoTax: plan.skippedNoTax,
    };

    for (const item of plan.items) {
      try {
        await this.uow.withTransaction(async (trx: Knex.Transaction) => {
          if (item.taxChanged) {
            await model()
              .query(trx)
              .findById(item.id)
              .patch({ taxAmountWithheld: item.recomputedTax } as any);
          }
          await rewrite(item.id, trx);
        });
        if (item.taxChanged) result.taxUpdated += 1;
        result.reposted += 1;
      } catch (error) {
        // Один сломанный документ не должен отменять перепроведение остальных.
        result.failed += 1;
        this.logger.warn(
          `Не удалось перепровести ${documentType} #${item.id}: ${error}`,
        );
      }
    }
    return result;
  }
}
