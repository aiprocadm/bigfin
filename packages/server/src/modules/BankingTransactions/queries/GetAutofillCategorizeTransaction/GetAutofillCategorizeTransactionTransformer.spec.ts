import { GetAutofillCategorizeTransctionTransformer } from './GetAutofillCategorizeTransactionTransformer';

/**
 * Поведение приоритета подсказок autofill (Фаза 2):
 * распознанное правило → память по контрагенту → дефолт по направлению.
 */
const makeTransformer = (options: Record<string, any>) => {
  const transformer = new GetAutofillCategorizeTransctionTransformer();
  transformer.setOptions(options);
  return transformer;
};

describe('GetAutofillCategorizeTransctionTransformer — подсказки по контрагенту', () => {
  describe('creditAccountId (статья)', () => {
    it('правило главнее памяти по контрагенту', () => {
      const t = makeTransformer({
        firstUncategorizedTransaction: {
          recognizedTransaction: { assignedAccountId: 1001 },
        },
        contactMemory: { creditAccountId: 2002, transactionType: 'other_income' },
      });
      expect(t.creditAccountId()).toBe(1001);
    });

    it('память по контрагенту, если правила нет', () => {
      const t = makeTransformer({
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: { creditAccountId: 2002, transactionType: 'other_income' },
      });
      expect(t.creditAccountId()).toBe(2002);
    });

    it('null, если ни правила, ни памяти', () => {
      const t = makeTransformer({
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: null,
      });
      expect(t.creditAccountId()).toBeNull();
    });
  });

  describe('transactionType (тип операции)', () => {
    it('тип из памяти, если правила нет', () => {
      const t = makeTransformer({
        uncategorizedTransactions: [{ amount: -500 }],
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: { creditAccountId: 2002, transactionType: 'other_income' },
      });
      expect(t.transactionType()).toBe('other_income');
    });

    it('дефолт по направлению (расход), если ни правила, ни памяти', () => {
      const t = makeTransformer({
        uncategorizedTransactions: [{ amount: -500 }],
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: null,
      });
      expect(t.transactionType()).toBe('other_expense');
    });

    it('дефолт по направлению (приход)', () => {
      const t = makeTransformer({
        uncategorizedTransactions: [{ amount: 500 }],
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: null,
      });
      expect(t.transactionType()).toBe('other_income');
    });
  });

  describe('suggestedContactId / suggestedByContact', () => {
    it('suggestedContactId прокидывается из опций', () => {
      const t = makeTransformer({ suggestedContactId: 55 });
      expect(t.suggestedContactId()).toBe(55);
    });

    it('suggestedByContact=true, когда статья из памяти и нет правила', () => {
      const t = makeTransformer({
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: { creditAccountId: 2002, transactionType: 'other_income' },
      });
      expect(t.suggestedByContact()).toBe(true);
    });

    it('suggestedByContact=false, когда строка распознана правилом', () => {
      const t = makeTransformer({
        firstUncategorizedTransaction: {
          recognizedTransaction: { assignedAccountId: 1001 },
        },
        contactMemory: { creditAccountId: 2002, transactionType: 'other_income' },
      });
      expect(t.suggestedByContact()).toBe(false);
    });

    it('suggestedByContact=false без памяти', () => {
      const t = makeTransformer({
        firstUncategorizedTransaction: { recognizedTransaction: null },
        contactMemory: null,
      });
      expect(t.suggestedByContact()).toBe(false);
    });
  });
});
