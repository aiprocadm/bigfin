import { FinancialTransactionLockingGuardSubscriber } from './FinancialsTransactionLockingGuardSubscriber';

/**
 * И3 (карта v12): складская корректировка порождает GL-проводки, поэтому её
 * нельзя провести/удалить задним числом в закрытый период. Стражи были
 * отключены (закомментированы со старой сигнатурой) — здесь проверяем, что
 * восстановленные стражи зовут замок с датой корректировки.
 */
describe('FinancialTransactionLockingGuardSubscriber — склад (И3)', () => {
  let guard: jest.Mock;
  let subscriber: FinancialTransactionLockingGuardSubscriber;

  beforeEach(() => {
    guard = jest.fn().mockResolvedValue(undefined);
    subscriber = new FinancialTransactionLockingGuardSubscriber({
      transactionLockingGuard: guard,
    } as any);
  });

  it('создание проведённой корректировки → проверяет замок на её дату', async () => {
    await subscriber.transactionsLockingGuardOnInventoryAdjCreating({
      quickAdjustmentDTO: { publish: true, date: '2026-03-05' } as any,
      trx: {} as any,
    });
    expect(guard).toHaveBeenCalledWith('2026-03-05');
  });

  it('создание черновика (не проведён) → замок не трогается', async () => {
    await subscriber.transactionsLockingGuardOnInventoryAdjCreating({
      quickAdjustmentDTO: { publish: false, date: '2026-03-05' } as any,
      trx: {} as any,
    });
    expect(guard).not.toHaveBeenCalled();
  });

  it('удаление проведённой корректировки → проверяет замок', async () => {
    await subscriber.transactionsLockingGuardOnInventoryAdjDeleting({
      inventoryAdjustment: { isPublished: true, date: '2026-03-05' } as any,
      trx: {} as any,
    });
    expect(guard).toHaveBeenCalledWith('2026-03-05');
  });

  it('удаление черновика → замок не трогается', async () => {
    await subscriber.transactionsLockingGuardOnInventoryAdjDeleting({
      inventoryAdjustment: { isPublished: false, date: '2026-03-05' } as any,
      trx: {} as any,
    });
    expect(guard).not.toHaveBeenCalled();
  });

  it('проведение корректировки → проверяет замок на её дату', async () => {
    await subscriber.transactionsLockingGuardOnInventoryAdjPublishing({
      oldInventoryAdjustment: { date: '2026-03-05' } as any,
      trx: {} as any,
    });
    expect(guard).toHaveBeenCalledWith('2026-03-05');
  });
});
