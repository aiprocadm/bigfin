import {
  ICreditNoteCreatedPayload,
  ICreditNoteDeletedPayload,
  ICreditNoteEditedPayload,
  ICreditNoteOpenedPayload,
} from '../types/CreditNotes.types';
import { CreditNoteGLEntries } from '../commands/CreditNoteGLEntries';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { events } from '@/common/events/events';

/**
 * Ошибки записи журнала не глушим.
 *
 * Nest по умолчанию проглатывает исключения обработчиков событий, а
 * проводки пишутся именно тут. С предохранителем двойной записи это дало
 * бы худший из миров: документ сохранён, журнала у него нет, и никто об
 * этом не знает. С `suppressErrors: false` ошибка доходит до команды,
 * транзакция откатывается — документ не сохраняется вовсе.
 */
@Injectable()
export class CreditNoteGLEntriesSubscriber {
  constructor(private readonly creditNoteGLEntries: CreditNoteGLEntries) {}

  /**
   * Writes the GL entries once the credit note transaction created or open.
   * @param {ICreditNoteCreatedPayload|ICreditNoteOpenedPayload} payload -
   */
  @OnEvent(events.creditNote.onCreated, { suppressErrors: false })
  public async writeGlEntriesOnceCreditNoteCreated({
    creditNote,
    trx,
  }: ICreditNoteCreatedPayload | ICreditNoteOpenedPayload) {
    // Can't continue if the credit note is not published yet.
    if (!creditNote.isPublished) return;

    await this.creditNoteGLEntries.createVendorCreditGLEntries(
      creditNote.id,
      trx,
    );
  }

  /**
   * Writes the GL entries once the vendor credit transaction opened.
   * @param {ICreditNoteOpenedPayload} payload
   */
  @OnEvent(events.creditNote.onOpened, { suppressErrors: false })
  public async writeGLEntriesOnceCreditNoteOpened({
    creditNote,
    trx,
  }: ICreditNoteOpenedPayload) {
    await this.creditNoteGLEntries.createVendorCreditGLEntries(
      creditNote.id,
      trx,
    );
  }

  /**
   * Reverts GL entries once credit note deleted.
   */
  @OnEvent(events.creditNote.onDeleted, { suppressErrors: false })
  public async revertGLEntriesOnceCreditNoteDeleted({
    oldCreditNote,
    creditNoteId,
    trx,
  }: ICreditNoteDeletedPayload) {
    // Can't continue if the credit note is not published yet.
    if (!oldCreditNote.isPublished) return;

    await this.creditNoteGLEntries.revertVendorCreditGLEntries(creditNoteId);
  }

  /**
   * Edits vendor credit associated GL entries once the transaction edited.
   * @param {ICreditNoteEditedPayload} payload -
   */
  @OnEvent(events.creditNote.onEdited, { suppressErrors: false })
  public async editVendorCreditGLEntriesOnceEdited({
    creditNote,
    trx,
  }: ICreditNoteEditedPayload) {
    // Can't continue if the credit note is not published yet.
    if (!creditNote.isPublished) return;

    await this.creditNoteGLEntries.editVendorCreditGLEntries(creditNote.id, trx);
  }
}
