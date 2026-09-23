// © 2026 Bigfin
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as moment from 'moment';
import { events } from '@/common/events/events';
import { WebhookDispatcherService } from '../WebhookDispatcher.service';

/**
 * События продукта → вебхуки (FT-092 ТЗ-3). В теле — только то, что нужно
 * подписчику, чтобы понять событие и при желании запросить подробности
 * через API.
 *
 * Сбой рассылки не отменяет само действие: операция важнее уведомления о
 * ней. Ошибка попадает в журнал сервера.
 */
@Injectable()
export class WebhookEventsSubscriber {
  private readonly logger = new Logger(WebhookEventsSubscriber.name);

  constructor(private readonly dispatcher: WebhookDispatcherService) {}

  private async safely(event: string, data: Record<string, unknown>, trx?: any) {
    try {
      await this.dispatcher.dispatch(event, data, trx);
    } catch (error) {
      this.logger.error(`Вебхук «${event}» не поставлен в очередь: ${(error as Error)?.message}`);
    }
  }

  @OnEvent(events.cashflow.onTransactionCreated)
  async onTransactionCreated({ cashflowTransaction, trx }: any) {
    if (!cashflowTransaction?.id) return;
    await this.safely(
      'transaction.created',
      {
        id: cashflowTransaction.id,
        date: moment(cashflowTransaction.date).format('YYYY-MM-DD'),
        amount: Number(cashflowTransaction.amount),
        currencyCode: cashflowTransaction.currencyCode,
        transactionType: cashflowTransaction.transactionType,
        cashflowAccountId: cashflowTransaction.cashflowAccountId,
        creditAccountId: cashflowTransaction.creditAccountId,
        description: cashflowTransaction.description ?? null,
      },
      trx,
    );
  }

  @OnEvent(events.cashflow.onTransactionCategorized)
  async onTransactionCategorized({ cashflowTransaction, trx }: any) {
    if (!cashflowTransaction?.id) return;
    await this.safely(
      'transaction.article_changed',
      { id: cashflowTransaction.id, creditAccountId: cashflowTransaction.creditAccountId, reason: 'categorized' },
      trx,
    );
  }

  @OnEvent(events.cashflow.onTransactionSplitsChanged)
  async onSplitsChanged({ cashflowTransactionId, parts, trx }: any) {
    await this.safely('transaction.article_changed', { id: cashflowTransactionId, parts, reason: 'split' }, trx);
  }

  @OnEvent(events.paymentRequest.onApproved)
  async onPaymentRequestApproved({ paymentRequest, trx }: any) {
    await this.safely(
      'payment_request.approved',
      {
        id: paymentRequest.id,
        amount: Number(paymentRequest.amount),
        currencyCode: paymentRequest.currencyCode,
        dueDate: moment(paymentRequest.dueDate).format('YYYY-MM-DD'),
        plannedOperationId: paymentRequest.plannedOperationId ?? null,
      },
      trx,
    );
  }
}
