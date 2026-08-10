import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { ISaleInvoiceEditingPayload } from '../SaleInvoice.types';
import { InvoicePaymentsGLEntriesRewrite } from '../InvoicePaymentsGLRewrite';

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
export class InvoicePaymentGLRewriteSubscriber {
  constructor(
    private readonly invoicePaymentsRewriteGLEntries: InvoicePaymentsGLEntriesRewrite,
  ) {}

  /**
   * Writes associated invoiceso of payment receive once edit.
   * @param {ISaleInvoiceEditingPayload} -
   */
  @OnEvent(events.saleInvoice.onEdited, { suppressErrors: false })
  async paymentGLEntriesRewriteOnPaymentEdit({
    oldSaleInvoice,
    trx,
  }: ISaleInvoiceEditingPayload) {
    await this.invoicePaymentsRewriteGLEntries.invoicePaymentsGLEntriesRewrite(
      oldSaleInvoice.id,
      trx,
    );
  }
}
