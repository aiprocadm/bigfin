// © 2026 Bigfin
import { BankReconciliationService } from './BankReconciliation.service';

/**
 * Решения по строкам сверки (FT-040 ТЗ-3) на подделках.
 *
 * Подделка запроса — цепочка: любой вызов возвращает её же, а ожидание
 * отдаёт заданный ответ. Проверяется, ЧТО служба делает с ответами, а не
 * как устроен запрос.
 */
function chain(result: any, spy?: (method: string, args: any[]) => void): any {
  const proxy: any = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
      }
      return (...args: any[]) => {
        spy?.(String(prop), args);
        return proxy;
      };
    },
  });
  return proxy;
}

function makeService(items: any[]) {
  const calls: any = { trash: [], restore: [], created: [], patched: [] };
  const rec = { id: 1, accountId: 1000, toDate: '2026-06-30', bankBalance: null };
  const reconciliationModel = () => ({ query: () => chain(rec) });
  const itemModel = () => ({
    query: () =>
      chain(items, (method, args) => {
        if (method === 'patch') calls.patched.push(args[0]);
      }),
  });
  const service = new BankReconciliationService(
    { get: () => 7 } as any,
    {
      trash: async (list: any[], reason: string) => calls.trash.push({ list, reason }),
      restore: async (list: any[]) => calls.restore.push(list),
    } as any,
    { create: async (dto: any) => calls.created.push(dto) } as any,
    {} as any,
    {} as any,
    {} as any,
    reconciliationModel as any,
    itemModel as any,
    (() => ({ query: () => chain({ total: 0 }) })) as any,
    (() => ({ query: () => chain([]) })) as any,
    (() => ({ query: () => chain({ debit: 0, credit: 0 }) })) as any,
    (() => ({ query: () => chain([]) })) as any,
    (() => ({ query: () => chain({ currencyCode: 'RUB' }) })) as any,
  );
  return { service, calls };
}

describe('решения по сверке (FT-040)', () => {
  it('«Добавить»: новая строка — с номером банка (повторная сверка её узнает)', async () => {
    const { service, calls } = makeService([
      { id: 11, side: 'missing_here', date: '2026-06-05', amount: -999, externalId: 'tinkoff:5' },
    ]);
    await service.resolve(1, [11], 'add');
    expect(calls.created).toEqual([
      expect.objectContaining({ accountId: 1000, amount: -999, externalId: 'tinkoff:5', currencyCode: 'RUB' }),
    ]);
    expect(calls.patched[0]).toMatchObject({ resolvedAs: 'added' });
  });

  it('«Добавить» удалённую у нас строку — возвращает её из корзины, а не плодит дубль', async () => {
    const { service, calls } = makeService([
      { id: 12, side: 'missing_here', date: '2026-06-05', amount: -999, transactionId: 3, transactionKind: 'bank_line', deletedAt: '2026-06-10' },
    ]);
    await service.resolve(1, [12], 'add');
    expect(calls.restore).toEqual([[{ kind: 'bank_line', id: 3 }]]);
    expect(calls.created).toEqual([]);
  });

  it('«Удалить» нашу строку — в корзину с причиной «сверка»', async () => {
    const { service, calls } = makeService([
      { id: 13, side: 'missing_bank', date: '2026-06-04', amount: -40, transactionId: 9, transactionKind: 'cashflow' },
    ]);
    await service.resolve(1, [13], 'delete');
    expect(calls.trash).toEqual([{ list: [{ kind: 'cashflow', id: 9 }], reason: 'reconciliation' }]);
  });

  it('кнопка не той стороны отвергается с понятной ошибкой', async () => {
    const { service } = makeService([{ id: 14, side: 'missing_bank', amount: -1 }]);
    await expect(service.resolve(1, [14], 'add')).rejects.toMatchObject({
      errorType: 'RECONCILIATION_WRONG_SIDE',
    });
  });
});

describe('сверка видит все деньги по счёту, а не только выписку', () => {
  function makeRunService(legs: any[], lines: any[]) {
    const inserted: any[] = [];
    const rec = { id: 1, accountId: 1000, fromDate: '2026-06-01', toDate: '2026-06-30', bankBalance: null };
    const itemModel = () => ({
      query: () =>
        chain(inserted, (method, args) => {
          if (method === 'insert') inserted.push(args[0]);
        }),
    });
    const service = new BankReconciliationService(
      { get: () => 7 } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      (() => ({ query: () => chain(rec) })) as any,
      itemModel as any,
      (() => ({ query: () => chain(lines) })) as any,
      (() => ({ query: () => chain([]) })) as any,
      (() => ({ query: () => chain(legs) })) as any,
      (() => ({ query: () => chain([]) })) as any,
      (() => ({ query: () => chain({ currencyCode: 'RUB' }) })) as any,
    );
    return { service, inserted };
  }

  it('оплата счёта покупателя — не «нет у нас»; разнесённая строка сверяется номером банка', async () => {
    const { service, inserted } = makeRunService(
      [
        // Оплата счёта покупателя на банковский счёт: две проводки одного документа.
        { referenceType: 'PaymentReceive', referenceId: 50, date: '2026-06-10', debit: 60000, credit: 0 },
        // Разнесённая строка выписки → денежная операция 70.
        { referenceType: 'CashflowTransaction', referenceId: 70, date: '2026-06-12', debit: 0, credit: 1500 },
      ],
      [
        { id: 5, accountId: 1000, date: '2026-06-12', amount: -1500, externalId: 'tinkoff:9', categorized: true, categorizeRefType: 'CashflowTransaction', categorizeRefId: 70 },
      ],
    );
    await service.run(1, [
      { date: '2026-06-10', amount: 60000, externalId: 'tinkoff:8' },
      { date: '2026-06-12', amount: -1500, externalId: 'tinkoff:9' },
    ]);
    // Ни «нет у нас», ни «нет в банке»: всё сошлось.
    expect(inserted.filter((row) => row && row.side)).toEqual([]);
  });

  it('документ другого раздела «нет в банке» — удалить его корзиной нельзя, ошибка названа', async () => {
    const { service } = makeService([
      { id: 15, side: 'missing_bank', amount: 60000, transactionId: 50, transactionKind: 'document', description: 'PaymentReceive' },
    ]);
    await expect(service.resolve(1, [15], 'delete')).rejects.toMatchObject({
      errorType: 'RECONCILIATION_DOCUMENT_NOT_TRASHABLE',
    });
  });
});

