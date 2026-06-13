// © 2026 Bigfin
import { MarkInstallmentPaidService } from './MarkInstallmentPaid.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a thenable fluent-chain stub that resolves to `value` at any depth.
 *
 * Every method call on the chain returns a new proxy that also resolves to
 * `value` when awaited. This lets us handle all the mixed `.findById()`,
 * `.where().andWhere().resultSize()`, `.patch()`, `.delete()`,
 * `.withGraphFetched()` call shapes without enumerating each one.
 *
 * `spies` is an optional record of { methodName: jest.fn() } whose fns will
 * be called (and still return the fluent chain) so we can assert on them.
 */
function fluentChain(value: any, spies: Record<string, jest.Mock> = {}): any {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        // Make the chain itself a thenable so `await chain` resolves to value.
        return (resolve: (v: any) => any) => Promise.resolve(value).then(resolve);
      }
      if (prop === 'catch') {
        return (reject: (r: any) => any) =>
          Promise.resolve(value).catch(reject);
      }
      // Return a function that, when called, invokes the spy (if any) and
      // returns another fluent chain resolving to the same value.
      return (...args: any[]) => {
        if (spies[prop]) spies[prop](...args);
        return fluentChain(value, spies);
      };
    },
  };
  return new Proxy({} as object, handler);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CREDIT_ID = 1;
const INSTALLMENT_ID = 10;

const fakeCreditBase = {
  id: CREDIT_ID,
  paymentAccountId: 5,
  liabilityAccountId: 20,
  interestExpenseAccountId: 30,
  status: 'active',
};

const fakeInstallmentBase = {
  id: INSTALLMENT_ID,
  creditId: CREDIT_ID,
  seqNo: 1,
  dueDate: '2026-07-01',
  principalAmount: '10000',
  interestAmount: '500',
  paymentAmount: '10500',
  status: 'planned',
  paidDate: null,
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface MakeServiceOpts {
  credit?: any;
  installment?: any;
  /** How many remaining 'planned' installments after patch (0 → close credit). */
  remainingPlanned?: number;
}

function makeService(opts: MakeServiceOpts = {}) {
  const {
    credit = fakeCreditBase,
    installment = fakeInstallmentBase,
    remainingPlanned = 0,
  } = opts;

  // --- ledgerStorage ---------------------------------------------------------
  const commitSpy = jest.fn().mockResolvedValue(undefined);
  const ledgerStorage = { commit: commitSpy };

  // --- tenancyContext ---------------------------------------------------------
  const tenancyContext = {
    getTenantMetadata: () => Promise.resolve({ baseCurrency: 'RUB' }),
  };

  // --- uow -------------------------------------------------------------------
  // Executes the callback immediately with a fake trx token.
  const uow = { withTransaction: (cb: any) => cb('__trx__') };

  // --- patchInstallmentSpy ---------------------------------------------------
  const patchInstallmentSpy = jest.fn().mockResolvedValue(undefined);
  const deletePlannedSpy = jest.fn().mockResolvedValue(undefined);
  const patchCreditSpy = jest.fn().mockResolvedValue(undefined);

  // We need the creditModel to:
  //   call 1: .query(trx).findById(creditId) → credit
  //   call 2: .query(trx).findById(creditId).patch(...)  → undefined
  //   call 3: .query(trx).findById(creditId).withGraphFetched(...)  → credit
  //
  // We track call count per model factory invocation.
  let creditQueryCallCount = 0;
  const creditModel = () => ({
    query: (_trx: any) => {
      creditQueryCallCount += 1;
      const callNo = creditQueryCallCount;
      if (callNo === 1) {
        // First call: findById → credit
        return fluentChain(credit);
      }
      if (callNo === 2) {
        // Second call: findById().patch() — spy on patch
        return fluentChain(undefined, { patch: patchCreditSpy });
      }
      // Third call: findById().withGraphFetched() → credit with installments
      return fluentChain({ ...credit, installments: [installment] });
    },
  });

  // installmentModel:
  //   call 1: .query(trx).findById(id).where(...) → installment
  //   call 2: .query(trx).findById(id).patch(...) → undefined  (spy on patch)
  //   call 3: .query(trx).where(...).andWhere(...).resultSize() → remainingPlanned
  let installmentQueryCallCount = 0;
  const installmentModel = () => ({
    query: (_trx: any) => {
      installmentQueryCallCount += 1;
      const callNo = installmentQueryCallCount;
      if (callNo === 1) {
        // findById().where() → installment
        return fluentChain(installment);
      }
      if (callNo === 2) {
        // findById().patch() → spy
        return fluentChain(undefined, { patch: patchInstallmentSpy });
      }
      // resultSize call — resolve to remainingPlanned count
      return fluentChain(remainingPlanned);
    },
  });

  // plannedOperationModel: .query(trx).where().andWhere().delete() → spy
  const plannedOperationModel = () => ({
    query: (_trx: any) => fluentChain(undefined, { delete: deletePlannedSpy }),
  });

  const service = new MarkInstallmentPaidService(
    uow as any,
    ledgerStorage as any,
    tenancyContext as any,
    creditModel as any,
    installmentModel as any,
    plannedOperationModel as any,
  );

  return {
    service,
    commitSpy,
    patchInstallmentSpy,
    patchCreditSpy,
    deletePlannedSpy,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarkInstallmentPaidService', () => {
  describe('хэппи-путь: оплата последнего взноса', () => {
    it('вызывает ledgerStorage.commit ровно один раз', async () => {
      const { service, commitSpy } = makeService({ remainingPlanned: 0 });

      await service.markPaid(CREDIT_ID, INSTALLMENT_ID);

      expect(commitSpy).toHaveBeenCalledTimes(1);
    });

    it('патчит рассрочку статусом paid', async () => {
      const { service, patchInstallmentSpy } = makeService({
        remainingPlanned: 0,
      });

      await service.markPaid(CREDIT_ID, INSTALLMENT_ID);

      expect(patchInstallmentSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paid' }),
      );
    });

    it('закрывает кредит когда все взносы оплачены (remaining=0)', async () => {
      const { service, patchCreditSpy } = makeService({ remainingPlanned: 0 });

      await service.markPaid(CREDIT_ID, INSTALLMENT_ID);

      expect(patchCreditSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'closed' }),
      );
    });

    it('возвращает объект кредита', async () => {
      const { service } = makeService({ remainingPlanned: 0 });

      const result = await service.markPaid(CREDIT_ID, INSTALLMENT_ID);

      expect(result).toMatchObject({ id: CREDIT_ID });
    });
  });

  describe('хэппи-путь: оплата НЕ последнего взноса', () => {
    it('НЕ закрывает кредит когда остались неоплаченные взносы', async () => {
      const { service, patchCreditSpy } = makeService({ remainingPlanned: 2 });

      await service.markPaid(CREDIT_ID, INSTALLMENT_ID);

      expect(patchCreditSpy).not.toHaveBeenCalled();
    });

    it('всё равно вызывает ledgerStorage.commit', async () => {
      const { service, commitSpy } = makeService({ remainingPlanned: 2 });

      await service.markPaid(CREDIT_ID, INSTALLMENT_ID);

      expect(commitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ошибки', () => {
    it('бросает CREDIT_NOT_FOUND когда кредит не найден', async () => {
      const { service } = makeService({ credit: null });

      await expect(
        service.markPaid(CREDIT_ID, INSTALLMENT_ID),
      ).rejects.toMatchObject({ errorType: 'CREDIT_NOT_FOUND' });
    });

    it('бросает INSTALLMENT_NOT_FOUND когда рассрочка не найдена', async () => {
      const { service } = makeService({ installment: null });

      await expect(
        service.markPaid(CREDIT_ID, INSTALLMENT_ID),
      ).rejects.toMatchObject({ errorType: 'INSTALLMENT_NOT_FOUND' });
    });

    it('бросает INSTALLMENT_ALREADY_PAID когда статус уже paid', async () => {
      const { service } = makeService({
        installment: { ...fakeInstallmentBase, status: 'paid' },
      });

      await expect(
        service.markPaid(CREDIT_ID, INSTALLMENT_ID),
      ).rejects.toMatchObject({ errorType: 'INSTALLMENT_ALREADY_PAID' });
    });
  });
});
