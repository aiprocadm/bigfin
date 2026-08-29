import { getExportableService } from '@/modules/Export/decorators/ExportableModel.decorator';
import { exportRowsLimit } from '@/modules/Export/exportRowsLimit';
import { BankTransactionsExportable } from './BankTransactionsExportable';
import { BankTransaction } from '../models/BankTransaction';
import { BankTransactionMeta } from '../models/BankTransaction.meta';

/**
 * С2 (карта v14): экспорт банковских операций был мёртвым — кнопка в UI без
 * обработчика, Exportable-сервиса не существовало. Деньги — единственный
 * список, который нельзя было забрать.
 */
describe('BankTransactionsExportable', () => {
  it('зарегистрирован в реестре экспорта под именем модели', () => {
    expect(getExportableService(BankTransaction.name)).toBe(
      BankTransactionsExportable,
    );
  });

  it('мета объявляет ресурс экспортируемым с колонками', () => {
    expect(BankTransactionMeta.exportable).toBe(true);
    expect(Object.keys(BankTransactionMeta.columns).length).toBeGreaterThan(5);
  });

  it('отдаёт операции с ограничением размера выгрузки', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const limit = jest.fn().mockResolvedValue(rows);
    const orderBy = jest.fn(() => ({ limit }));
    const withGraphFetched = jest.fn(() => ({ orderBy }));
    const model = () => ({ query: () => ({ withGraphFetched }) });

    const service = new BankTransactionsExportable(model as any);
    await expect(service.exportable({})).resolves.toEqual(rows);
    expect(limit).toHaveBeenCalledWith(exportRowsLimit() + 1);
  });
});
