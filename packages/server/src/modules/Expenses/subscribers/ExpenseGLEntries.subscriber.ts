import {
  IExpenseCreatedPayload,
  IExpenseEventDeletePayload,
  IExpenseEventEditPayload,
  IExpenseEventPublishedPayload,
} from '../Expenses.types';
import { ExpenseGLEntriesStorageService } from './ExpenseGLEntriesStorage.sevice';
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
export class ExpensesWriteGLSubscriber {
  /**
   * @param {ExpenseGLEntriesStorageService} expenseGLEntries - Expense GL entries storage service.
   */
  constructor(
    private readonly expenseGLEntries: ExpenseGLEntriesStorageService,
  ) {}

  /**
   * Handles the writing journal entries once the expense created.
   * @param {IExpenseCreatedPayload} payload -
   */
  @OnEvent(events.expenses.onCreated, { suppressErrors: false })
  public async handleWriteGLEntriesOnceCreated({
    expense,
    trx,
  }: IExpenseCreatedPayload) {
    // In case expense published, write journal entries.
    if (!expense.publishedAt) return;

    await this.expenseGLEntries.writeExpenseGLEntries(expense.id, trx);
  }

  /**
   * Handle writing expense journal entries once the expense edited.
   * @param {IExpenseEventEditPayload} payload -
   */
  @OnEvent(events.expenses.onEdited, { suppressErrors: false })
  public async handleRewriteGLEntriesOnceEdited({
    expenseId,
    expense,
    authorizedUser,
    trx,
  }: IExpenseEventEditPayload) {
    // Cannot continue if the expense is not published.
    if (!expense.publishedAt) return;

    await this.expenseGLEntries.rewriteExpenseGLEntries(expense.id, trx);
  }

  /**
   * Reverts expense journal entries once the expense deleted.
   * @param {IExpenseEventDeletePayload} payload -
   */
  @OnEvent(events.expenses.onDeleted, { suppressErrors: false })
  public async handleRevertGLEntriesOnceDeleted({
    expenseId,
    trx,
  }: IExpenseEventDeletePayload) {
    await this.expenseGLEntries.revertExpenseGLEntries(expenseId, trx);
  }

  /**
   * Handles writing expense journal once the expense publish.
   * @param {IExpenseEventPublishedPayload} payload -
   */
  @OnEvent(events.expenses.onPublished, { suppressErrors: false })
  public async handleWriteGLEntriesOncePublished({
    expense,
    trx,
  }: IExpenseEventPublishedPayload) {
    // In case expense published, write journal entries.
    if (!expense.publishedAt) return;

    await this.expenseGLEntries.rewriteExpenseGLEntries(expense.id, trx);
  }
}
