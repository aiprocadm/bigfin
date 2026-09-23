// © 2026 Bigfin
import { AutoConfirmPlansOnFactSubscriber } from './AutoConfirmPlansOnFact';

/** FT-052 ТЗ-3: появилась операция — план с автоподтверждением закрыт. */
function makeSubscriber(plans: any[]) {
  const patches: any[] = [];
  const chain: any = {};
  ['where', 'whereIn', 'whereNotNull', 'orWhereBetween'].forEach((method) => {
    chain[method] = (...args: any[]) => {
      if (typeof args[0] === 'function') args[0](chain);
      return chain;
    };
  });
  chain.then = (resolve: any) => resolve(plans);
  chain.findById = (id: number) => ({ patch: async (data: any) => patches.push({ id, ...data }) });
  const model = () => ({ query: () => chain });
  return { subscriber: new AutoConfirmPlansOnFactSubscriber(model as any), patches };
}

const fact = (extra: Record<string, any> = {}) => ({
  id: 555,
  transactionType: 'OtherExpense',
  amount: 50_000,
  date: '2026-10-12',
  cashflowAccountId: 1000,
  contactId: 7,
  ...extra,
});

const plan = (extra: Record<string, any> = {}) => ({
  id: 1,
  direction: 'outflow',
  amount: 50_000,
  plannedDate: '2026-10-10',
  accountId: 1000,
  contactId: 7,
  autoConfirm: true,
  matchExactAmount: true,
  status: 'planned',
  ...extra,
});

describe('автоподтверждение плана при появлении операции', () => {
  it('AC: разовый план исполнен со ссылкой на факт', async () => {
    const { subscriber, patches } = makeSubscriber([plan()]);
    await subscriber.onCreated({ cashflowTransaction: fact() });
    expect(patches).toEqual([{ id: 1, matchedTransactionId: 555, status: 'done' }]);
  });

  it('повторяющийся уходит на следующее вхождение, а не закрывается', async () => {
    const { subscriber, patches } = makeSubscriber([plan({ recurrence: { frequency: 'monthly', interval: 1 } })]);
    await subscriber.onCategorized({ cashflowTransaction: fact() });
    expect(patches).toEqual([{ id: 1, matchedTransactionId: 555, plannedDate: '2026-11-10' }]);
  });

  it('перевод между своими счетами план не закрывает; несовпадение — тоже', async () => {
    const transfer = makeSubscriber([plan()]);
    await transfer.subscriber.onCreated({ cashflowTransaction: fact({ transactionType: 'TransferToAccount' }) });
    expect(transfer.patches).toEqual([]);
    const other = makeSubscriber([plan()]);
    await other.subscriber.onCreated({ cashflowTransaction: fact({ contactId: 8 }) });
    expect(other.patches).toEqual([]);
  });
});
