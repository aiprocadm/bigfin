import { CategorizeBankTransaction } from './CategorizeBankTransaction';
import { transformCategorizeTransToCashflow } from '../../BankingTransactions/utils';

/**
 * Verifies that contactId from CategorizeBankTransactionDto is threaded through
 * to the cashflow transaction created during categorization.
 */
describe('CategorizeBankTransaction — contactId propagation', () => {
  /**
   * Build a minimal uncategorized transaction stub.
   */
  const makeUncategorized = (id: number, amount: number, accountId = 10) => ({
    id,
    amount,
    accountId,
    isExcluded: false,
    categorized: false,
  });

  /**
   * Unit test: transformCategorizeTransToCashflow must include contactId.
   * This is the pure-function part — no mocks needed.
   */
  describe('transformCategorizeTransToCashflow util', () => {
    it('propagates contactId when provided', () => {
      const uncats = [makeUncategorized(1, 500)];
      const dto: any = {
        date: new Date('2024-01-15'),
        creditAccountId: 20,
        transactionType: 'OtherIncome',
        exchangeRate: 1,
        currencyCode: 'RUB',
        referenceNo: undefined,
        description: undefined,
        transactionNumber: undefined,
        branchId: undefined,
        contactId: 42,
      };

      const result = transformCategorizeTransToCashflow(uncats as any, dto);

      expect(result.contactId).toBe(42);
    });

    it('omits contactId when not provided', () => {
      const uncats = [makeUncategorized(1, 500)];
      const dto: any = {
        date: new Date('2024-01-15'),
        creditAccountId: 20,
        transactionType: 'OtherIncome',
        exchangeRate: 1,
        currencyCode: 'RUB',
      };

      const result = transformCategorizeTransToCashflow(uncats as any, dto);

      expect(result.contactId).toBeUndefined();
    });
  });

  /**
   * Integration-style unit test: CategorizeBankTransaction.categorize() must
   * pass contactId into createBankTransaction.newCashflowTransaction().
   */
  describe('CategorizeBankTransaction.categorize', () => {
    const buildService = (overrides: Partial<{
      uncatModel: any;
      newCashflowTransaction: jest.Mock;
    }> = {}) => {
      const createdTx = { id: 99 };
      const newCashflowTransaction =
        overrides.newCashflowTransaction ?? jest.fn().mockResolvedValue(createdTx);

      const uncatQuery = {
        whereIn: jest.fn().mockReturnThis(),
        throwIfNotFound: jest.fn().mockResolvedValue([
          makeUncategorized(1, -300, 10),
        ]),
        patch: jest.fn().mockResolvedValue(undefined),
      };
      // Second call (re-fetch after patch) returns same array without throwIfNotFound
      const uncatQueryRefetch = {
        whereIn: jest.fn().mockResolvedValue([makeUncategorized(1, -300, 10)]),
      };

      let queryCallCount = 0;
      const uncatModel = overrides.uncatModel ?? (() => ({
        query: jest.fn((trx?) => {
          queryCallCount++;
          if (queryCallCount === 1) return uncatQuery;          // initial fetch
          if (queryCallCount === 2) return uncatQuery;          // patch call
          return uncatQueryRefetch;                             // refetch
        }),
      }));

      const eventPublisher = {
        emitAsync: jest.fn().mockResolvedValue(undefined),
      };

      const uow = {
        withTransaction: jest.fn((cb: any) => cb({})),
      };

      const commandValidators = {
        validateTransactionsShouldNotCategorized: jest.fn(),
        validateUncategorizeTransactionType: jest.fn(),
      };

      const createBankTransaction = { newCashflowTransaction };

      const service = new CategorizeBankTransaction(
        eventPublisher as any,
        uow as any,
        commandValidators as any,
        createBankTransaction as any,
        uncatModel as any,
      );

      return { service, newCashflowTransaction };
    };

    it('passes contactId to newCashflowTransaction when provided', async () => {
      const { service, newCashflowTransaction } = buildService();

      await service.categorize(1, {
        date: new Date('2024-01-15'),
        creditAccountId: 20,
        transactionType: 'OtherIncome',
        exchangeRate: 1,
        contactId: 42,
      } as any);

      expect(newCashflowTransaction).toHaveBeenCalledTimes(1);
      const callArg = newCashflowTransaction.mock.calls[0][0];
      expect(callArg.contactId).toBe(42);
    });

    it('does not set contactId when omitted from DTO', async () => {
      const { service, newCashflowTransaction } = buildService();

      await service.categorize(1, {
        date: new Date('2024-01-15'),
        creditAccountId: 20,
        transactionType: 'OtherIncome',
        exchangeRate: 1,
      } as any);

      expect(newCashflowTransaction).toHaveBeenCalledTimes(1);
      const callArg = newCashflowTransaction.mock.calls[0][0];
      expect(callArg.contactId).toBeUndefined();
    });
  });
});
