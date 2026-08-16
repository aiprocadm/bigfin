import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FinancialTransactionLocking } from '../guards/FinancialTransactionLockingGuard';
import {
  IManualJournalCreatingPayload,
  IManualJournalEditingPayload,
  IManualJournalPublishingPayload,
} from '@/modules/ManualJournals/types/ManualJournals.types';
import {
  IExpenseCreatingPayload,
  IExpenseDeletingPayload,
  IExpenseEventEditingPayload,
  IExpensePublishingPayload,
} from '@/modules/Expenses/Expenses.types';
import {
  ICommandCashflowCreatingPayload,
  ICommandCashflowDeletingPayload,
} from '@/modules/BankingTransactions/types/BankingTransactions.types';
import {
  IInventoryAdjustmentCreatingPayload,
  IInventoryAdjustmentDeletingPayload,
  IInventoryAdjustmentPublishingPayload,
} from '@/modules/InventoryAdjutments/types/InventoryAdjustments.types';
import { events } from '@/common/events/events';

@Injectable()
export class FinancialTransactionLockingGuardSubscriber {
  constructor(
    public readonly financialTransactionsLocking: FinancialTransactionLocking,
  ) { }

  /**
   * ---------------------------------------------
   * - MANUAL JOURNALS SERVICE.
   * ---------------------------------------------
   */
  /**
   * Transaction locking guard on manual journal creating.
   * @param {IManualJournalCreatingPayload} payload
   */
  @OnEvent(events.manualJournals.onCreating, { suppressErrors: false })
  public async transactionsLockingGuardOnManualJournalCreating({
    manualJournalDTO,
  }: IManualJournalCreatingPayload) {
    // Can't continue if the new journal is not published yet.
    if (!manualJournalDTO.publish) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      manualJournalDTO.date,
    );
  }

  /**
   * Transactions locking guard on manual journal deleting.
   * @param {IManualJournalEditingPayload} payload
   */
  @OnEvent(events.manualJournals.onDeleting, { suppressErrors: false })
  public async transactionsLockingGuardOnManualJournalDeleting({
    oldManualJournal,
  }: IManualJournalEditingPayload) {
    // Can't continue if the old journal is not published.
    if (!oldManualJournal.isPublished) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      oldManualJournal.date,
    );
  }

  /**
   * Transactions locking guard on manual journal editing.
   * @param {IManualJournalDeletingPayload} payload
   */
  @OnEvent(events.manualJournals.onEditing, { suppressErrors: false })
  public async transactionsLockingGuardOnManualJournalEditing({
    oldManualJournal,
    manualJournalDTO,
  }: IManualJournalEditingPayload) {
    // Can't continue if the old and new journal are not published.
    if (!oldManualJournal.isPublished && !manualJournalDTO.publish) return;

    // Validate the old journal date.
    await this.financialTransactionsLocking.transactionLockingGuard(
      oldManualJournal.date,
    );
    // Validate the new journal date.
    await this.financialTransactionsLocking.transactionLockingGuard(
      manualJournalDTO.date,
    );
  }

  /**
   * Transactions locking guard on manual journal publishing.
   * @param {IManualJournalPublishingPayload}
   */
  @OnEvent(events.manualJournals.onPublishing, { suppressErrors: false })
  public async transactionsLockingGuardOnManualJournalPublishing({
    oldManualJournal,
  }: IManualJournalPublishingPayload) {
    await this.financialTransactionsLocking.transactionLockingGuard(
      oldManualJournal.date,
    );
  }

  /**
   * ---------------------------------------------
   * - EXPENSES SERVICE.
   * ---------------------------------------------
   */

  /**
   * Transactions locking guard on expense creating.
   * @param {IExpenseCreatingPayload} payload
   */
  @OnEvent(events.expenses.onCreating, { suppressErrors: false })
  public async transactionsLockingGuardOnExpenseCreating({
    expenseDTO,
  }: IExpenseCreatingPayload) {
    // Can't continue if the new expense is not published yet.
    if (!expenseDTO.publish) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      expenseDTO.paymentDate,
    );
  }

  /**
   * Transactions locking guard on expense deleting.
   * @param {IExpenseDeletingPayload} payload
   */
  @OnEvent(events.expenses.onDeleting, { suppressErrors: false })
  public async transactionsLockingGuardOnExpenseDeleting({
    oldExpense,
  }: IExpenseDeletingPayload) {
    // Can't continue if expense transaction is not published.
    if (!oldExpense.isPublished) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      oldExpense.paymentDate,
    );
  }

  /**
   * Transactions locking guard on expense editing.
   * @param {IExpenseEventEditingPayload}
   */
  @OnEvent(events.expenses.onEditing, { suppressErrors: false })
  public async transactionsLockingGuardOnExpenseEditing({
    oldExpense,
    expenseDTO,
  }: IExpenseEventEditingPayload) {
    // Can't continue if the old and new expense is not published.
    if (!oldExpense.isPublished && !expenseDTO.publish) return;

    // Validate the old expense date.
    await this.financialTransactionsLocking.transactionLockingGuard(
      oldExpense.paymentDate,
    );
    // Validate the new expense date.
    await this.financialTransactionsLocking.transactionLockingGuard(
      expenseDTO.paymentDate,
    );
  }

  /**
   * Transactions locking guard on expense publishing.
   * @param {IExpensePublishingPayload} payload -
   */
  @OnEvent(events.expenses.onPublishing, { suppressErrors: false })
  public async transactionsLockingGuardOnExpensePublishing({
    oldExpense,
  }: IExpensePublishingPayload) {
    await this.financialTransactionsLocking.transactionLockingGuard(
      oldExpense.paymentDate,
    );
  }

  /**
   * ---------------------------------------------
   * - CASHFLOW SERVICE.
   * ---------------------------------------------
   */

  /**
   * Transactions locking guard on cashflow transaction creating.
   * @param {ICommandCashflowCreatingPayload}
   */
  @OnEvent(events.cashflow.onTransactionCreating, { suppressErrors: false })
  public async transactionsLockingGuardOnCashflowTransactionCreating({
    newTransactionDTO,
  }: ICommandCashflowCreatingPayload) {
    if (!newTransactionDTO.publish) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      newTransactionDTO.date,
    );
  }

  /**
   * Transactions locking guard on cashflow transaction deleting.
   * @param {ICommandCashflowDeletingPayload}
   */
  @OnEvent(events.cashflow.onTransactionDeleting, { suppressErrors: false })
  public async transactionsLockingGuardOnCashflowTransactionDeleting({
    oldCashflowTransaction,
  }: ICommandCashflowDeletingPayload) {
    // Can't continue if the cashflow transaction is not published.
    if (!oldCashflowTransaction.isPublished) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      oldCashflowTransaction.date,
    );
  }

  /**
   * ---------------------------------------------
   * - INVENTORY ADJUSTMENT SERVICE.
   * ---------------------------------------------
   */

  /**
   * Transactions locking guard on inventory adjustment creating (И3 карты v12).
   * Складская корректировка порождает GL-проводки, поэтому её тоже нельзя
   * провести задним числом в закрытый период. Восстановлено под актуальную
   * сигнатуру `transactionLockingGuard(date)` (раньше блок был отключён со
   * старой сигнатурой `(tenantId, date)`).
   * @param {IInventoryAdjustmentCreatingPayload} payload
   */
  @OnEvent(events.inventoryAdjustment.onQuickCreating, { suppressErrors: false })
  public async transactionsLockingGuardOnInventoryAdjCreating({
    quickAdjustmentDTO,
  }: IInventoryAdjustmentCreatingPayload) {
    // Черновик (не проведён) остатки не двигает — замок его не касается.
    if (!quickAdjustmentDTO.publish) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      quickAdjustmentDTO.date,
    );
  }

  /**
   * Transaction locking guard on inventory adjustment deleting.
   * @param {IInventoryAdjustmentDeletingPayload} payload
   */
  @OnEvent(events.inventoryAdjustment.onDeleting, { suppressErrors: false })
  public async transactionsLockingGuardOnInventoryAdjDeleting({
    inventoryAdjustment,
  }: IInventoryAdjustmentDeletingPayload) {
    // Удаление трогает остатки только у проведённой корректировки.
    if (!inventoryAdjustment.isPublished) return;

    await this.financialTransactionsLocking.transactionLockingGuard(
      inventoryAdjustment.date,
    );
  }

  /**
   * Transaction locking guard on inventory adjustment publishing.
   * @param {IInventoryAdjustmentPublishingPayload} payload
   */
  @OnEvent(events.inventoryAdjustment.onPublishing, { suppressErrors: false })
  public async transactionsLockingGuardOnInventoryAdjPublishing({
    oldInventoryAdjustment,
  }: IInventoryAdjustmentPublishingPayload) {
    await this.financialTransactionsLocking.transactionLockingGuard(
      oldInventoryAdjustment.date,
    );
  }
}
