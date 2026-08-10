import { events } from '@/common/events/events';
import { RefundVendorCreditGLEntries } from '../commands/RefundVendorCreditGLEntries';
import {
  IRefundVendorCreditCreatedPayload,
  IRefundVendorCreditDeletedPayload,
} from '../types/VendorCreditRefund.types';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

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
export class RefundVendorCreditGLEntriesSubscriber {
  constructor(
    private readonly refundVendorCreditGLEntries: RefundVendorCreditGLEntries,
  ) { }

  /**
   * Writes refund vendor credit GL entries once the transaction created.
   * @param {IRefundVendorCreditCreatedPayload} payload -
   */
  @OnEvent(events.vendorCredit.onRefundCreated, { suppressErrors: false })
  async writeRefundVendorCreditGLEntriesOnceCreated({
    trx,
    refundVendorCredit,
    vendorCredit,
  }: IRefundVendorCreditCreatedPayload) {
    await this.refundVendorCreditGLEntries.createRefundVendorCreditGLEntries(
      refundVendorCredit.id,
      trx,
    );
  }

  /**
   * Reverts refund vendor credit GL entries once the transaction deleted.
   * @param {IRefundVendorCreditDeletedPayload} payload -
   */
  @OnEvent(events.vendorCredit.onRefundDeleted, { suppressErrors: false })
  async revertRefundVendorCreditGLEntriesOnceDeleted({
    trx,
    refundCreditId,
    oldRefundCredit,
  }: IRefundVendorCreditDeletedPayload) {
    await this.refundVendorCreditGLEntries.revertRefundVendorCreditGLEntries(
      refundCreditId,
      trx,
    );
  }
}

