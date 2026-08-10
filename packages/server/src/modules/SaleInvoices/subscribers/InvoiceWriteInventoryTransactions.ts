import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceInventoryTransactions } from '../commands/inventory/InvoiceInventoryTransactions';
import { events } from '@/common/events/events';
import {
  ISaleInvoiceCreatedPayload,
  ISaleInvoiceEditedPayload,
  ISaleInvoiceDeletedPayload,
  ISaleInvoiceEventDeliveredPayload,
} from '../SaleInvoice.types';

/**
 * Ошибки записи складских движений не глушим.
 *
 * Nest по умолчанию проглатывает исключения обработчиков событий. Для
 * склада это значит: документ сохранён, а остатки не изменились — и никто
 * об этом не знает. Движения пишутся в транзакции самого документа,
 * поэтому с `suppressErrors: false` ошибка откатывает документ целиком:
 * лучше отказать в продаже, чем продать и потерять списание со склада.
 */
@Injectable()
export class SaleInvoiceWriteInventoryTransactionsSubscriber {
  constructor(
    private readonly saleInvoiceInventory: InvoiceInventoryTransactions,
  ) {}

  /**
   * Handles the writing inventory transactions once the invoice created.
   * @param {ISaleInvoiceCreatedPayload} payload
   */
  @OnEvent(events.saleInvoice.onCreated, { suppressErrors: false })
  public async handleWritingInventoryTransactions({
    saleInvoice,
    trx,
  }: ISaleInvoiceCreatedPayload | ISaleInvoiceEventDeliveredPayload) {
    // Can't continue if the sale invoice is not delivered yet.
    if (!saleInvoice.deliveredAt) return null;

    await this.saleInvoiceInventory.recordInventoryTranscactions(
      saleInvoice,
      false,
      trx,
    );
  }

  /**
   * Rewriting the inventory transactions once the sale invoice be edited.
   * @param {ISaleInvoiceEditPayload} payload -
   */
  @OnEvent(events.saleInvoice.onEdited, { suppressErrors: false })
  public async handleRewritingInventoryTransactions({
    saleInvoice,
    trx,
  }: ISaleInvoiceEditedPayload) {
    await this.saleInvoiceInventory.recordInventoryTranscactions(
      saleInvoice,
      true,
      trx,
    );
  }

  /**
   * Handles deleting the inventory transactions once the invoice deleted.
   * @param {ISaleInvoiceDeletedPayload} payload -
   */
  @OnEvent(events.saleInvoice.onDeleted, { suppressErrors: false })
  public async handleDeletingInventoryTransactions({
    saleInvoiceId,
    oldSaleInvoice,
    trx,
  }: ISaleInvoiceDeletedPayload) {
    await this.saleInvoiceInventory.revertInventoryTransactions(
      saleInvoiceId,
      trx,
    );
  }
}
