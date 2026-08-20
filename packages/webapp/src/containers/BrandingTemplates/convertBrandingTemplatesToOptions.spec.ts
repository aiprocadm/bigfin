import { describe, it, expect } from 'vitest';
import { convertBrandingTemplatesToOptions } from './BrandingTemplatesSelectFields';

/**
 * Р4 карты v16 (попутная находка живой пробы). Пока шаблоны брендирования не
 * загрузились (или запрос упал), функция возвращала undefined — и FSelect
 * падал на items.find, роняя ВСЮ форму оплаты белым экраном.
 */
describe('convertBrandingTemplatesToOptions', () => {
  it('undefined на входе — пустой список, а не undefined', () => {
    expect(convertBrandingTemplatesToOptions(undefined as any)).toEqual([]);
  });

  it('шаблоны превращаются в варианты', () => {
    expect(
      convertBrandingTemplatesToOptions([
        { id: 1, template_name: 'Основной' },
      ]),
    ).toEqual([{ text: 'Основной', value: 1 }]);
  });
});
