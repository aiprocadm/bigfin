// © 2026 Bigfin
import { CreateCreditService } from './CreateCredit.service';

// ─────────────────────────────────────────────────────────────────
// Shared stubs
// ─────────────────────────────────────────────────────────────────
const uow = { withTransaction: (cb: any) => cb({}) };
const tenancyContext = {
  getTenantMetadata: () => Promise.resolve({ baseCurrency: 'RUB' }),
};

// ─────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────
interface MakeOpts {
  paymentAccount?: any;
  existingInterestAccount?: any;
  existingArticle?: any;
  existingArticleAccountMapping?: any;
}

const makeService = (opts: MakeOpts = {}) => {
  const committedLedgers: any[] = [];
  const insertedPlanned: any[][] = [];
  const createdAccounts: any[] = [];
  const createdArticles: any[] = [];

  // Counter to hand out sequential IDs for insertAndFetch.
  let nextId = 100;
  const nextAutoId = () => ++nextId;

  // ── accountModel ──────────────────────────────────────────────
  // The service calls .query(trx) multiple times on the same model for:
  //   1. findById → payment account
  //   2. findOne  → interest expense account (find-or-create)
  //   3. insertAndFetch → interest expense account (when not found)
  //   4. insertAndFetch → liability account
  // We track call order via a simple counter.
  let accountFindOneCallCount = 0;
  let accountInsertAndFetchCallCount = 0;

  const accountModel = () => ({
    query: () => ({
      findById: () => Promise.resolve(opts.paymentAccount),
      findOne: () => {
        accountFindOneCallCount += 1;
        // First findOne → interest expense account lookup.
        return Promise.resolve(
          accountFindOneCallCount === 1 ? opts.existingInterestAccount : null,
        );
      },
      insertAndFetch: (attrs: any) => {
        accountInsertAndFetchCallCount += 1;
        const account = { id: nextAutoId(), ...attrs };
        createdAccounts.push(account);
        return Promise.resolve(account);
      },
    }),
  });

  // ── articleModel ──────────────────────────────────────────────
  const articleModel = () => ({
    query: () => ({
      findOne: () => Promise.resolve(opts.existingArticle ?? null),
      insertAndFetch: (attrs: any) => {
        const article = { id: nextAutoId(), ...attrs };
        createdArticles.push(article);
        return Promise.resolve(article);
      },
    }),
  });

  // ── articleAccountModel ───────────────────────────────────────
  const articleAccountModel = () => ({
    query: () => ({
      findOne: () =>
        Promise.resolve(opts.existingArticleAccountMapping ?? null),
      insert: () => Promise.resolve({}),
    }),
  });

  // ── creditModel ───────────────────────────────────────────────
  // insertGraph returns a minimal object; findById.withGraphFetched returns fresh.
  let insertedCreditAttrs: any = null;
  const freshInstallments = [
    { id: 71, dueDate: '2026-02-15', paymentAmount: 9432.07 },
    { id: 72, dueDate: '2026-03-15', paymentAmount: 9432.07 },
    { id: 73, dueDate: '2026-04-15', paymentAmount: 9432.07 },
    { id: 74, dueDate: '2026-05-15', paymentAmount: 9432.07 },
    { id: 75, dueDate: '2026-06-15', paymentAmount: 9432.07 },
    { id: 76, dueDate: '2026-07-15', paymentAmount: 9432.07 },
  ];
  const freshCredit = { id: 7, installments: freshInstallments };

  const creditModel = () => ({
    query: () => ({
      insertGraph: (attrs: any) => {
        insertedCreditAttrs = attrs;
        return Promise.resolve({ id: 7 });
      },
      findById: () => ({
        withGraphFetched: () => Promise.resolve(freshCredit),
      }),
    }),
  });

  // ── plannedOperationModel ─────────────────────────────────────
  const plannedOperationModel = () => ({
    query: () => ({
      insert: (rows: any[]) => {
        insertedPlanned.push(rows);
        return Promise.resolve([]);
      },
    }),
  });

  // ── ledgerStorage ─────────────────────────────────────────────
  const ledgerStorage = {
    commit: (ledger: any) => {
      committedLedgers.push(ledger);
      return Promise.resolve();
    },
  };

  const service = new CreateCreditService(
    uow as any,
    ledgerStorage as any,
    tenancyContext as any,
    creditModel as any,
    accountModel as any,
    articleModel as any,
    articleAccountModel as any,
    plannedOperationModel as any,
  );

  return {
    service,
    committedLedgers,
    insertedPlanned,
    createdAccounts,
    createdArticles,
    getInsertedCreditAttrs: () => insertedCreditAttrs,
    getFreshCredit: () => freshCredit,
  };
};

// ─────────────────────────────────────────────────────────────────
// Shared DTO
// ─────────────────────────────────────────────────────────────────
const dto = {
  name: 'Кредит Сбербанк',
  lender: 'ПАО Сбербанк',
  principalAmount: 100000,
  annualInterestRate: 18,
  termMonths: 6,
  startDate: '2026-01-15',
  scheduleType: 'annuity' as const,
  paymentAccountId: 5,
};

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────
describe('CreateCreditService', () => {
  // ── Validation ────────────────────────────────────────────────
  it('сумма ≤ 0 отклоняется до транзакции', async () => {
    const { service } = makeService({
      paymentAccount: { id: 5, accountType: 'bank' },
    });
    await expect(
      service.create({ ...dto, principalAmount: 0 } as any),
    ).rejects.toMatchObject({ errorType: 'INVALID_AMOUNT' });
  });

  it('счёт списания не найден → ошибка', async () => {
    const { service } = makeService({ paymentAccount: undefined });
    await expect(service.create(dto as any)).rejects.toMatchObject({
      errorType: 'PAYMENT_ACCOUNT_NOT_FOUND',
    });
  });

  it('не-денежный счёт списания отклоняется', async () => {
    const { service } = makeService({
      paymentAccount: { id: 5, accountType: 'income' },
    });
    await expect(service.create(dto as any)).rejects.toMatchObject({
      errorType: 'PAYMENT_ACCOUNT_NOT_CASH',
    });
  });

  // ── Happy path ────────────────────────────────────────────────
  it('создаёт кредит с графиком, счётом-обязательством, GL-проводкой и плановыми операциями', async () => {
    const { service, committedLedgers, insertedPlanned, createdAccounts, getInsertedCreditAttrs, getFreshCredit } =
      makeService({
        paymentAccount: { id: 5, accountType: 'bank' },
        existingInterestAccount: null, // будет создан лениво
        existingArticle: null,
        existingArticleAccountMapping: null,
      });

    const result = await service.create(dto as any);

    // Возвращает fresh-объект с рассрочками.
    expect(result).toBe(getFreshCredit());

    // insertGraph был вызван с корректными полями.
    const attrs = getInsertedCreditAttrs();
    expect(attrs).not.toBeNull();
    expect(attrs.name).toBe(dto.name);
    expect(attrs.status).toBe('active');
    expect(Array.isArray(attrs.installments)).toBe(true);
    expect(attrs.installments).toHaveLength(6); // termMonths = 6
    // Первая рассрочка имеет ожидаемые поля.
    const first = attrs.installments[0];
    expect(first.seqNo).toBe(1);
    expect(typeof first.paymentAmount).toBe('number');
    expect(first.status).toBe('planned');

    // GL-проводка выдачи зафиксирована ровно один раз.
    expect(committedLedgers).toHaveLength(1);
    const entries = committedLedgers[0].getEntries();
    expect(entries).toHaveLength(2);
    const debitEntry = entries.find((e: any) => e.debit > 0);
    const creditEntry = entries.find((e: any) => e.credit > 0);
    expect(debitEntry.debit).toBe(creditEntry.credit);
    expect(debitEntry.transactionType).toBe('CreditDisbursement');

    // Плановые операции вставлены один раз с числом строк = числу рассрочек.
    expect(insertedPlanned).toHaveLength(1);
    expect(insertedPlanned[0]).toHaveLength(getFreshCredit().installments.length);
    const firstPlan = insertedPlanned[0][0];
    expect(firstPlan.direction).toBe('outflow');
    expect(firstPlan.sourceType).toBe('CreditInstallment');
    expect(firstPlan.status).toBe('planned');
    expect(firstPlan.currencyCode).toBe('RUB');
  });

  // ── Find-or-create: interest account ─────────────────────────
  it('счёт процентов создаётся лениво если не существует', async () => {
    const { service, createdAccounts } = makeService({
      paymentAccount: { id: 5, accountType: 'cash' },
      existingInterestAccount: null,
    });

    await service.create(dto as any);

    // Среди созданных счетов есть счёт процентов (slug) и счёт-обязательство.
    const interestAcc = createdAccounts.find(
      (a) => a.slug === 'loan-interest-expense',
    );
    expect(interestAcc).toBeDefined();
    expect(interestAcc.currencyCode).toBe('RUB');
  });

  it('существующий счёт процентов переиспользуется — не создаётся новый', async () => {
    const existingInterestAccount = {
      id: 42,
      slug: 'loan-interest-expense',
      accountType: 'expense',
    };
    const { service, createdAccounts } = makeService({
      paymentAccount: { id: 5, accountType: 'bank' },
      existingInterestAccount,
    });

    await service.create(dto as any);

    // Должен быть создан только счёт-обязательство, не счёт процентов.
    const interestAcc = createdAccounts.find(
      (a) => a.slug === 'loan-interest-expense',
    );
    expect(interestAcc).toBeUndefined();
  });

  // ── Find-or-create: article ───────────────────────────────────
  it('статья «Проценты по кредитам» создаётся лениво если не существует', async () => {
    const { service, createdArticles } = makeService({
      paymentAccount: { id: 5, accountType: 'bank' },
      existingArticle: null,
    });

    await service.create(dto as any);

    expect(createdArticles).toHaveLength(1);
    expect(createdArticles[0].name).toBe('Проценты по кредитам');
    expect(createdArticles[0].kind).toBe('expense');
  });

  it('существующая статья переиспользуется — не создаётся новая', async () => {
    const { service, createdArticles } = makeService({
      paymentAccount: { id: 5, accountType: 'bank' },
      existingArticle: { id: 55, name: 'Проценты по кредитам', kind: 'expense' },
    });

    await service.create(dto as any);

    expect(createdArticles).toHaveLength(0);
  });
});
