import { Injectable } from '@nestjs/common';
import {
  ICreditNoteCreatedPayload,
  ICreditNoteDeletedPayload,
  ICreditNoteEditedPayload,
} from '../types/CreditNotes.types';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { CreditNoteInventoryTransactions } from '../commands/CreditNotesInventoryTransactions';

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
export class CreditNoteInventoryTransactionsSubscriber {
  constructor(
    private readonly inventoryTransactions: CreditNoteInventoryTransactions,
  ) {}

  /**
   * Writes inventory transactions once credit note created.
   * @param {ICreditNoteCreatedPayload} payload -
   * @returns {Promise<void>}
   */
  @OnEvent(events.creditNote.onCreated, { suppressErrors: false })
  @OnEvent(events.creditNote.onOpened, { suppressErrors: false })
  public async writeInventoryTranscationsOnceCreated({
    creditNote,
    trx,
  }: ICreditNoteCreatedPayload) {
    // Can't continue if the credit note is open yet.
    if (!creditNote.isOpen) return;

    await this.inventoryTransactions.createInventoryTransactions(
      creditNote,
      trx,
    );
  }

  /**
   * Rewrites inventory transactions once credit note edited.
   * @param {ICreditNoteEditedPayload} payload -
   * @returns {Promise<void>}
   */
  @OnEvent(events.creditNote.onEdited, { suppressErrors: false })
  public async rewriteInventoryTransactionsOnceEdited({
    creditNote,
    trx,
  }: ICreditNoteEditedPayload) {
    // Can't continue if the credit note is open yet.
    if (!creditNote.isOpen) return;

    await this.inventoryTransactions.editInventoryTransactions(
      creditNote.id,
      creditNote,
      trx,
    );
  }

  /**
   * Reverts inventory transactions once credit note deleted.
   * @param {ICreditNoteDeletedPayload} payload -
   */
  @OnEvent(events.creditNote.onDeleted, { suppressErrors: false })
  public async revertInventoryTransactionsOnceDeleted({
    oldCreditNote,
    trx,
  }: ICreditNoteDeletedPayload) {
    // Can't continue if the credit note is open yet.
    if (!oldCreditNote.isOpen) return;

    await this.inventoryTransactions.deleteInventoryTransactions(
      oldCreditNote.id,
      trx,
    );
  }
}
