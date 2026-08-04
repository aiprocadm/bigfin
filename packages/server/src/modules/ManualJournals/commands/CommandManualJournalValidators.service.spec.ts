import { CommandManualJournalValidators } from './CommandManualJournalValidators.service';
import { ERRORS } from '../constants';

/** Заглушка построителя запросов: цепочка возвращает себя, await — строки. */
function queryStub(rows: any) {
  const builder: any = {};
  ['where', 'whereIn', 'whereNot', 'onBuild', 'findOne'].forEach((m) => {
    builder[m] = jest.fn((arg: any) => {
      // onBuild получает функцию — вызываем её, как это делает Objection.
      if (m === 'onBuild' && typeof arg === 'function') arg(builder);
      return m === 'findOne' ? Promise.resolve(rows?.[0]) : builder;
    });
  });
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve(rows).then(resolve, reject);
  return builder;
}

const modelStub = (rows: any) => (() => ({ query: () => queryStub(rows) })) as any;

const entry = (over: Record<string, any> = {}) => ({
  index: 1,
  accountId: 1,
  credit: 0,
  debit: 0,
  ...over,
});

const validators = (accounts: any[] = [], journals: any[] = [], contacts: any[] = []) =>
  new CommandManualJournalValidators(
    modelStub(accounts),
    modelStub(journals),
    modelStub(contacts),
  );

describe('ручная проводка — равенство дебета и кредита', () => {
  it('пропускает проводку, где дебет равен кредиту', () => {
    const dto: any = {
      entries: [
        entry({ debit: 1000, accountId: 1 }),
        entry({ credit: 1000, accountId: 2 }),
      ],
    };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).not.toThrow();
  });

  it('не пропускает перекос между дебетом и кредитом', () => {
    const dto: any = {
      entries: [entry({ debit: 1000 }), entry({ credit: 900 })],
    };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).toThrow(
      expect.objectContaining({ errorType: ERRORS.CREDIT_DEBIT_NOT_EQUAL }),
    );
  });

  it('не пропускает пустую проводку с нулевыми суммами', () => {
    const dto: any = { entries: [entry(), entry()] };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).toThrow(
      expect.objectContaining({
        errorType: ERRORS.CREDIT_DEBIT_NOT_EQUAL_ZERO,
      }),
    );
  });

  it('не пропускает проводку, где заполнена только одна сторона', () => {
    const dto: any = { entries: [entry({ debit: 500 }), entry({ debit: 500 })] };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).toThrow(
      expect.objectContaining({
        errorType: ERRORS.CREDIT_DEBIT_NOT_EQUAL_ZERO,
      }),
    );
  });

  it('копеечная разница из-за дробей округляется и проводка проходит', () => {
    // 0.1 + 0.2 в двоичной арифметике даёт 0.30000000000000004 —
    // без округления до копеек такая проводка не сошлась бы.
    const dto: any = {
      entries: [
        entry({ debit: 0.1 }),
        entry({ debit: 0.2 }),
        entry({ credit: 0.3 }),
      ],
    };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).not.toThrow();
  });

  it('несколько строк с каждой стороны складываются', () => {
    const dto: any = {
      entries: [
        entry({ debit: 300 }),
        entry({ debit: 700 }),
        entry({ credit: 400 }),
        entry({ credit: 600 }),
      ],
    };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).not.toThrow();
  });

  it('незаполненные суммы считаются нулём, а не ломают проверку', () => {
    const dto: any = {
      entries: [
        { index: 1, accountId: 1, debit: 1000 },
        { index: 2, accountId: 2, credit: 1000 },
      ],
    };

    expect(() => validators().valdiateCreditDebitTotalEquals(dto)).not.toThrow();
  });
});

describe('ручная проводка — счета и номер', () => {
  it('пропускает, когда все счета существуют', async () => {
    const dto: any = {
      entries: [entry({ accountId: 1 }), entry({ accountId: 2 })],
    };
    const v = validators([{ id: 1 }, { id: 2 }]);

    await expect(v.validateAccountsExistance(dto)).resolves.toBeUndefined();
  });

  it('не пропускает проводку с несуществующим счётом', async () => {
    const dto: any = {
      entries: [entry({ accountId: 1 }), entry({ accountId: 99 })],
    };
    const v = validators([{ id: 1 }]);

    await expect(v.validateAccountsExistance(dto)).rejects.toMatchObject({
      errorType: ERRORS.ACCOUNTS_IDS_NOT_FOUND,
    });
  });

  it('свободный номер проводки проходит проверку', async () => {
    const v = validators([], []);

    await expect(v.validateManualJournalNoUnique('JE-1')).resolves.toBeUndefined();
  });

  it('занятый номер проводки не пропускается', async () => {
    const v = validators([], [{ id: 5, journalNumber: 'JE-1' }]);

    await expect(v.validateManualJournalNoUnique('JE-1')).rejects.toMatchObject({
      errorType: ERRORS.JOURNAL_NUMBER_EXISTS,
    });
  });
});
