// © 2026 Bigfin
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';
import { MODULE_ALLOWLIST } from './Features.constants';

describe('FeaturesConfigure — ru_print_forms', () => {
  it('флаг ru_print_forms присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.RU_PRINT_FORMS);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });

  it('флаг переключается пользователем на странице «Модули»', () => {
    expect(MODULE_ALLOWLIST).toContain(Features.RU_PRINT_FORMS);
  });
});
