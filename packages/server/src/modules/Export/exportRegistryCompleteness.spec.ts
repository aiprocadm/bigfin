import { getExportableService } from './decorators/ExportableModel.decorator';
import { SaleReceiptsExportable } from '@/modules/SaleReceipts/commands/SaleReceiptsExportable';
import { TaxRatesExportable } from '@/modules/TaxRates/TaxRatesExportable';
import { TaxRateModel } from '@/modules/TaxRates/models/TaxRate.model';

/**
 * С3 (карта v14): «выгрузить всё» вскрыла, что два одиночных экспорта давно
 * мертвы (оба отвечали 500): чеки не регистрировались в реестре вовсе,
 * а ставки — без меты и под именем, до которого не доходил ресурс диалога.
 */
describe('полнота реестра экспорта', () => {
  it('чеки продаж зарегистрированы', () => {
    expect(getExportableService('SaleReceipt')).toBe(SaleReceiptsExportable);
  });

  it('налоговые ставки зарегистрированы и несут мету с колонками', () => {
    expect(getExportableService(TaxRateModel.name)).toBe(TaxRatesExportable);
    const meta: any = (TaxRateModel as any).meta;
    expect(meta?.exportable).toBe(true);
    expect(Object.keys(meta?.columns ?? {}).length).toBeGreaterThan(3);
    expect(typeof (TaxRateModel as any).getMeta).toBe('function');
  });
});
