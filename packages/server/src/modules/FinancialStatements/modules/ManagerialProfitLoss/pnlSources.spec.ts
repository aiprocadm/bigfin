// © 2026 Bigfin
import { excludedReferenceTypes, PNL_SOURCE_KEYS, readPnlSources } from './pnlSources';

/** Источники данных управленческого ОПиУ (FT-012 ТЗ-3). */
describe('источники данных ОПиУ', () => {
  const store = (values: Record<string, unknown>) => ({
    get: ({ group, key }: { group: string; key: string }) =>
      group === 'pnl_sources' ? values[key] : undefined,
  });

  it('не настроено — включены все, ничего не исключается (отчёт как был)', () => {
    const sources = readPnlSources(store({}));
    expect(PNL_SOURCE_KEYS.every((key) => sources[key])).toBe(true);
    expect(excludedReferenceTypes(sources).size).toBe(0);
  });

  it('выключенные «Основные средства» исключают амортизацию и выбытие', () => {
    const excluded = excludedReferenceTypes(readPnlSources(store({ fixed_assets: '0' })));
    expect([...excluded].sort()).toEqual(['FixedAssetDepreciation', 'FixedAssetDisposal']);
  });

  it('зарплата и налоги в журнал не пишут — их выключение ничего не исключает', () => {
    const excluded = excludedReferenceTypes(readPnlSources(store({ payroll: false, taxes: 'false' })));
    expect(excluded.size).toBe(0);
  });
});
