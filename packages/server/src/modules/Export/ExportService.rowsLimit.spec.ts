// © 2026 Bigfin
import { ExportResourceService } from './ExportService';
import { exportRowsLimit } from './exportRowsLimit';

/**
 * М3 срез 4 (карта v15): у выгрузки не было настоящего предела — стояла
 * «бесконечность» 9999999. Большой раздел либо съедал память, либо отдавался
 * не целиком, и никто об этом не узнавал.
 *
 * Правило продукта: данные не теряются молча.
 */
const buildService = (rowsCount: number) => {
  const service = new ExportResourceService(
    null as any,
    null as any,
    { getResourceColumns: () => ({}) } as any,
    null as any,
    null as any,
  ) as any;

  const built = { count: 0 };

  service.getResourceMeta = () => ({});
  service.validateResourceMeta = () => {};
  service.getExportableData = async () =>
    Array.from({ length: rowsCount }, (_, i) => ({ id: i }));
  service.transformExportedData = (_resource: string, data: any[]) => data;
  service.getExportableColumns = () => [];
  service.createWorkbook = (...args: any[]) => {
    built.count += 1;
    return args;
  };
  service.exportWorkbook = () => 'файл';

  return { service, built };
};

describe('потолок строк выгрузки — сама выгрузка', () => {
  it('обычная выгрузка проходит как раньше', async () => {
    const { service, built } = buildService(10);

    const result = await service.exportAlsRun('items', 'csv');

    expect(result).toBe('файл');
    expect(built.count).toBe(1);
  });

  it('строк больше потолка — честный отказ, файл не собирается', async () => {
    const { service, built } = buildService(exportRowsLimit() + 1);
    let error: any;

    try {
      await service.exportAlsRun('items', 'csv');
    } catch (caught) {
      error = caught;
    }
    expect(error?.errorType).toBe('EXPORT_ROWS_LIMIT_EXCEEDED');
    // Собирать книгу из непомещающихся данных — зря съеденная память.
    expect(built.count).toBe(0);
  });

  it('в отказе видно, чего и сколько', async () => {
    const { service } = buildService(exportRowsLimit() + 3);
    let error: any;

    try {
      await service.exportAlsRun('sale_invoice', 'xlsx');
    } catch (caught) {
      error = caught;
    }
    expect(error?.payload?.rowsCount).toBe(exportRowsLimit() + 3);
    expect(error?.payload?.limit).toBe(exportRowsLimit());
    expect(error?.payload?.resource).toBe('sale_invoice');
  });
});
