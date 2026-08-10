import {
  IBillPaymentEventCreatedPayload,
  IBillPaymentEventDeletedPayload,
  IBillPaymentEventEditedPayload,
} from '../types/BillPayments.types';
import { BillPaymentGLEntries } from '../commands/BillPaymentGLEntries';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';

/**
 * Ошибки записи проводок не глушим.
 *
 * Nest по умолчанию проглатывает исключения обработчиков событий, а
 * журнал пишется именно тут. Без этого сбой записи выглядит как успешная
 * операция: документ сохранён, проводок нет, пользователь не знает.
 * С `suppressErrors: false` ошибка доходит до команды и транзакция
 * откатывается целиком.
 */
@Injectable()
export class BillPaymentGLEntriesSubscriber {
  constructor(
    private readonly billPaymentGLEntries: BillPaymentGLEntries,
  ) {}

  /**
   * Handle bill payment writing journal entries once created.
   */
  @OnEvent(events.billPayment.onCreated, { suppressErrors: false })
  async handleWriteJournalEntries({
    billPayment,
    trx,
  }: IBillPaymentEventCreatedPayload) {
    // Records the journal transactions after bills payment
    // and change diff account balance.
    await this.billPaymentGLEntries.writePaymentGLEntries(
      billPayment.id,
      trx
    );
  };

  /**
   * Handle bill payment re-writing journal entries once the payment transaction be edited.
   */
  @OnEvent(events.billPayment.onEdited, { suppressErrors: false })
  async handleRewriteJournalEntriesOncePaymentEdited({
    billPayment,
    trx,
  }: IBillPaymentEventEditedPayload) {
    await this.billPaymentGLEntries.rewritePaymentGLEntries(
      billPayment.id,
      trx
    );
  };

  /**
   * Reverts journal entries once bill payment deleted.
   */
  @OnEvent(events.billPayment.onDeleted, { suppressErrors: false })
  async handleRevertJournalEntries({
    billPaymentId,
    trx,
  }: IBillPaymentEventDeletedPayload) {
    await this.billPaymentGLEntries.revertPaymentGLEntries(
      billPaymentId,
      trx
    );
  };
}
