import { Injectable } from '@nestjs/common';
import {
  IPaymentReceivedCreatedPayload,
  IPaymentReceivedDeletedPayload,
  IPaymentReceivedEditedPayload,
} from '../types/PaymentReceived.types';
import { PaymentReceivedGLEntries } from '../commands/PaymentReceivedGLEntries';
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
export class PaymentReceivedGLEntriesSubscriber {
  /**
   * @param {PaymentReceivedGLEntries} paymentReceivedGLEntries - 
   */
  constructor(
    private readonly paymentReceivedGLEntries: PaymentReceivedGLEntries,
  ) {}

  /**
   * Handle journal entries writing once the payment receive created.
   */
  @OnEvent(events.paymentReceive.onCreated, { suppressErrors: false })
  private async handleWriteJournalEntriesOnceCreated({
    paymentReceiveId,
    trx,
  }: IPaymentReceivedCreatedPayload) {
    await this.paymentReceivedGLEntries.writePaymentGLEntries(
      paymentReceiveId,
      trx,
    );
  }

  /**
   * Handle journal entries writing once the payment receive edited.
   */
  @OnEvent(events.paymentReceive.onEdited, { suppressErrors: false })
  private async handleOverwriteJournalEntriesOnceEdited({
    paymentReceive,
    trx,
  }: IPaymentReceivedEditedPayload) {
    await this.paymentReceivedGLEntries.rewritePaymentGLEntries(
      paymentReceive.id,
      trx,
    );
  }

  /**
   * Handles revert journal entries once deleted.
   */
  @OnEvent(events.paymentReceive.onDeleted, { suppressErrors: false })
  private async handleRevertJournalEntriesOnceDeleted({
    paymentReceiveId,
    trx,
  }: IPaymentReceivedDeletedPayload) {
    await this.paymentReceivedGLEntries.revertPaymentGLEntries(
      paymentReceiveId,
      trx,
    );
  }
}
