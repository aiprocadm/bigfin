import { CategorizeTransactionAsExpense } from './CategorizeTransactionAsExpense';

/**
 * Verifies that categorizing a bank (cashflow) transaction as an expense maps
 * the bank transaction and the categorize DTO onto a valid expense DTO.
 *
 * The financially-sensitive invariant under test: the amount and the paying
 * (bank/cash) account always come from the bank transaction itself — never from
 * the client DTO — while the client only chooses the expense account (category)
 * and optional overrides (reference, description, exchange rate, branch).
 */
describe('CategorizeTransactionAsExpense.categorize — expense DTO mapping', () => {
  /**
   * Build a minimal bank transaction stub.
   */
  const makeTransaction = (overrides: Record<string, any> = {}) => ({
    id: 1,
    amount: 300,
    date: new Date('2024-01-15'),
    cashflowAccountId: 10,
    currencyCode: 'RUB',
    exchangeRate: 1,
    branchId: 7,
    contactId: 42,
    referenceNo: 'TX-REF',
    description: 'Bank description',
    ...overrides,
  });

  /**
   * Build the service with mocked dependencies and capture the expense DTO that
   * gets passed into createExpenseService.newExpense().
   */
  const buildService = (transaction: Record<string, any>) => {
    const newExpense = jest.fn().mockResolvedValue({ id: 99 });

    const query = {
      findById: jest.fn().mockReturnThis(),
      throwIfNotFound: jest.fn().mockResolvedValue(transaction),
      patchAndFetchById: jest
        .fn()
        .mockResolvedValue({ ...transaction, categorizeRefId: 99 }),
    };
    const bankTransactionModel = () => ({ query: jest.fn(() => query) });

    const eventPublisher = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const uow = { withTransaction: jest.fn((cb: any) => cb({})) };
    const createExpenseService = { newExpense };

    const service = new CategorizeTransactionAsExpense(
      uow as any,
      eventPublisher as any,
      createExpenseService as any,
      bankTransactionModel as any,
    );

    return { service, newExpense, query };
  };

  it('maps amount and paying account from the bank transaction, expense account from the DTO', async () => {
    const transaction = makeTransaction();
    const { service, newExpense } = buildService(transaction);

    await service.categorize(1, {
      expenseAccountId: 55,
      exchangeRate: 2,
      referenceNo: 'USER-REF',
      description: 'User description',
      branchId: 9,
    } as any);

    expect(newExpense).toHaveBeenCalledTimes(1);
    const expenseDTO = newExpense.mock.calls[0][0];

    // Bank transaction is the source of truth for money.
    expect(expenseDTO.paymentAccountId).toBe(transaction.cashflowAccountId);
    expect(expenseDTO.paymentDate).toBe(transaction.date);
    expect(expenseDTO.currencyCode).toBe('RUB');
    expect(expenseDTO.payeeId).toBe(transaction.contactId);
    expect(expenseDTO.publish).toBe(true);

    // Single category carrying the whole amount, on the chosen expense account.
    expect(expenseDTO.categories).toHaveLength(1);
    expect(expenseDTO.categories[0].expenseAccountId).toBe(55);
    expect(expenseDTO.categories[0].amount).toBe(transaction.amount);

    // DTO overrides win when provided.
    expect(expenseDTO.exchangeRate).toBe(2);
    expect(expenseDTO.referenceNo).toBe('USER-REF');
    expect(expenseDTO.description).toBe('User description');
    expect(expenseDTO.branchId).toBe(9);
  });

  it('falls back to the bank transaction values when DTO overrides are omitted', async () => {
    const transaction = makeTransaction();
    const { service, newExpense } = buildService(transaction);

    await service.categorize(1, {
      expenseAccountId: 55,
    } as any);

    const expenseDTO = newExpense.mock.calls[0][0];

    expect(expenseDTO.exchangeRate).toBe(transaction.exchangeRate);
    expect(expenseDTO.referenceNo).toBe(transaction.referenceNo);
    expect(expenseDTO.description).toBe(transaction.description);
    expect(expenseDTO.branchId).toBe(transaction.branchId);
  });

  it('marks the bank transaction as categorized to the created expense', async () => {
    const transaction = makeTransaction();
    const { service, query } = buildService(transaction);

    await service.categorize(1, { expenseAccountId: 55 } as any);

    expect(query.patchAndFetchById).toHaveBeenCalledWith(1, {
      categorizeRefType: 'Expense',
      categorizeRefId: 99,
      uncategorized: true,
    });
  });
});
