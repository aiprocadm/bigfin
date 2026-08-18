import * as xlsx from 'xlsx';
import { ExportAllService } from './ExportAllService';

/**
 * С3 (карта v14): «выгрузить всё» — одна xlsx-книга, лист на каждый
 * экспортируемый ресурс. До этого владелец мог забирать данные только
 * по одному списку за раз.
 */
describe('ExportAllService', () => {
  const build = () => {
    const exportService: any = {
      getExportableData: jest.fn(async (resource: string) => {
        if (resource === 'Broken') throw new Error('boom');
        return [{ name: 'Ромашка', amount: 100 }];
      }),
      transformExportedData: jest.fn((_r: string, data: any[]) => data),
      getExportableColumns: jest.fn(() => [
        { name: 'Name', type: 'text', accessor: 'name', group: '' },
        { name: 'Amount', type: 'number', accessor: 'amount', group: '' },
      ]),
    };
    const resourceService: any = {
      getResourceMeta: jest.fn(() => ({ exportable: true, columns: { a: 1 } })),
      getResourceColumns: jest.fn(() => ({})),
    };
    return { service: new ExportAllService(exportService, resourceService) };
  };

  it('строит книгу с листом на каждый ресурс', async () => {
    const { service } = build();
    const buffer = await service.exportAll(['SaleInvoice', 'Bill']);
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    expect(workbook.SheetNames).toContain('Sale Invoice');
    expect(workbook.SheetNames).toContain('Bill');
    const sheet = workbook.Sheets['Sale Invoice'];
    expect(sheet['A1'].v).toBe('Name');
    expect(sheet['A2'].v).toBe('Ромашка');
  });

  it('сломанный ресурс не роняет книгу и честно попадает в лист «Skipped»', async () => {
    const { service } = build();
    const buffer = await service.exportAll(['SaleInvoice', 'Broken']);
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    expect(workbook.SheetNames).toContain('Sale Invoice');
    expect(workbook.SheetNames).toContain('Skipped');
    const skipped = workbook.Sheets['Skipped'];
    expect(JSON.stringify(skipped)).toContain('Broken');
  });
});
