import { DeleteTaxRateService } from './DeleteTaxRate.service';
import { ERRORS } from '../constants';

/**
 * И2 (карта v12): нельзя удалить используемую налоговую ставку. Раньше сервис
 * удалял ставку без проверки ссылок — а на неё ссылаются позиции документов,
 * счета, проводки и товары. Удаление осиротляло эти ссылки.
 */
describe('DeleteTaxRateService — запрет удаления используемой ставки (И2)', () => {
  const validators = { validateTaxRateExistance: jest.fn() };
  // findById возвращает thenable запись, у которой есть метод delete() —
  // покрывает и `await query().findById(id)`, и `query(trx).findById(id).delete()`.
  const taxRateModel = () => ({
    query: (_trx?: any) => ({
      findById: (id: number) => {
        const record: any = Promise.resolve({ id, name: 'НДС 20%' });
        record.delete = jest.fn().mockResolvedValue(1);
        return record;
      },
    }),
  });

  const makeTrx = (usedTables: Record<string, boolean>) => {
    const trx: any = (table: string) => ({
      where: () => ({
        first: () => Promise.resolve(usedTables[table] ? { id: 1 } : undefined),
      }),
    });
    return trx;
  };

  const build = (trx: any) => {
    const emitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    const uow = { withTransaction: (cb: any) => cb(trx) };
    return new DeleteTaxRateService(
      emitter as any,
      uow as any,
      validators as any,
      taxRateModel as any,
    );
  };

  it.each([
    ['items_entries', 'позиции документов'],
    ['accounts_transactions', 'проводки'],
    ['tax_rate_transactions', 'регистр применения'],
    ['items', 'товары (ставка по умолчанию)'],
  ])('отказывает, если ставку используют: %s', async (table) => {
    const service = build(makeTrx({ [table]: true }));
    await expect(service.deleteTaxRate(1)).rejects.toMatchObject({
      errorType: ERRORS.TAX_RATE_IN_USE,
    });
  });

  it('удаляет ставку, если она нигде не используется', async () => {
    const trx = makeTrx({});
    const service = build(trx);
    await expect(service.deleteTaxRate(1)).resolves.toBeUndefined();
  });
});
