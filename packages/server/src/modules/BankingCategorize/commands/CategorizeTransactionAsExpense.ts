import { Knex } from 'knex';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BankTransaction } from '@/modules/BankingTransactions/models/BankTransaction';
import { CreateExpense } from '@/modules/Expenses/commands/CreateExpense.service';
import { Inject } from '@nestjs/common';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { Injectable } from '@nestjs/common';
import { events } from '@/common/events/events';
import { ICashflowTransactionCategorizedPayload } from '../types/BankingCategorize.types';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreateExpenseDto } from '@/modules/Expenses/dtos/Expense.dto';
import { CategorizeTransactionAsExpenseDTO } from '@/modules/BankingTransactions/types/BankingTransactions.types';

@Injectable()
export class CategorizeTransactionAsExpense {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
    private readonly createExpenseService: CreateExpense,

    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<
      typeof BankTransaction
    >,
  ) {}

  /**
   * Categorize the transaction as expense transaction.
   * @param {number} cashflowTransactionId
   * @param {CategorizeTransactionAsExpenseDTO} transactionDTO
   */
  public async categorize(
    cashflowTransactionId: number,
    transactionDTO: CategorizeTransactionAsExpenseDTO,
  ) {
    const transaction = await this.bankTransactionModel()
      .query()
      .findById(cashflowTransactionId)
      .throwIfNotFound();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onTransactionUncategorizing` event.
      await this.eventPublisher.emitAsync(
        events.cashflow.onTransactionCategorizingAsExpense,
        {
          trx,
        } as ICashflowTransactionCategorizedPayload,
      );
      // Maps the bank transaction and the categorize DTO onto an expense DTO.
      // The amount and the paying (bank/cash) account come from the bank
      // transaction itself so they can never be substituted; the user only
      // chooses the expense account (category) and optional overrides.
      const expenseDTO: CreateExpenseDto = {
        paymentDate: transaction.date,
        paymentAccountId: transaction.cashflowAccountId,
        referenceNo: transactionDTO.referenceNo ?? transaction.referenceNo,
        description: transactionDTO.description ?? transaction.description,
        currencyCode: transaction.currencyCode,
        exchangeRate:
          transactionDTO.exchangeRate ?? transaction.exchangeRate ?? 1,
        branchId: transactionDTO.branchId ?? transaction.branchId,
        payeeId: transaction.contactId,
        publish: true,
        categories: [
          {
            index: 1,
            expenseAccountId: transactionDTO.expenseAccountId,
            amount: transaction.amount,
            description:
              transactionDTO.description ?? transaction.description,
          },
        ],
      };
      // Creates a new expense transaction from the mapped DTO.
      const expenseTransaction = await this.createExpenseService.newExpense(
        expenseDTO,
        trx,
      );

      // Updates the item on the storage and fetches the updated once.
      const cashflowTransaction = await this.bankTransactionModel()
        .query(trx)
        .patchAndFetchById(cashflowTransactionId, {
          categorizeRefType: 'Expense',
          categorizeRefId: expenseTransaction.id,
          uncategorized: true,
        });
      // Triggers `onTransactionUncategorized` event.
      await this.eventPublisher.emitAsync(
        events.cashflow.onTransactionCategorizedAsExpense,
        {
          cashflowTransaction,
          trx,
        },
      );
    });
  }
}
