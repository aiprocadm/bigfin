/**
 * Р2 карты v18: русская дата с точками. До правок «ДД.ММ.ГГГГ» нельзя было
 * ни выбрать (нет в выпадашке), ни сохранить (нет в валидации @IsIn), а
 * дефолтная организация получала «28 Jul 2026» с английским месяцем.
 */
import { DATE_FORMATS as MISC_DATE_FORMATS } from '../Miscellaneous/Miscellaneous.constants';
import { DATE_FORMATS as ORG_DATE_FORMATS } from './Organization.constants';
import { transformBuildDto } from './Organization.utils';
import { Transformer } from '../Transformer/Transformer';

describe('Русский формат даты', () => {
  it('оба живых списка форматов содержат DD.MM.YYYY и DD.MM.YY', () => {
    for (const list of [MISC_DATE_FORMATS, ORG_DATE_FORMATS]) {
      expect(list).toContain('DD.MM.YYYY');
      expect(list).toContain('DD.MM.YY');
    }
  });

  it('новая русская организация получает формат DD.MM.YYYY по умолчанию', () => {
    const dto = transformBuildDto({ language: 'ru' } as any);
    expect(dto.dateFormat).toBe('DD.MM.YYYY');
  });

  it('нерусская организация получает прежний дефолт DD MMM YYYY', () => {
    const dto = transformBuildDto({ language: 'en' } as any);
    expect(dto.dateFormat).toBe('DD MMM YYYY');
  });

  it('явно выбранный формат не перекрывается дефолтом', () => {
    const dto = transformBuildDto({
      language: 'ru',
      dateFormat: 'MM/DD/yyyy',
    } as any);
    expect(dto.dateFormat).toBe('MM/DD/yyyy');
  });

  it('трансформер печатает словесный месяц по-русски при локали ru', () => {
    const transformer: any = new Transformer();
    transformer.setContext({ exportAls: {} });
    transformer.setDateFormat('DD MMMM YYYY');
    transformer.setDateLocale('ru');
    expect(transformer.formatDate('2026-07-28')).toBe('28 июля 2026');
  });

  it('без локали трансформер печатает месяц по-английски (как раньше)', () => {
    const transformer: any = new Transformer();
    transformer.setContext({ exportAls: {} });
    transformer.setDateFormat('DD MMM YYYY');
    expect(transformer.formatDate('2026-07-28')).toBe('28 Jul 2026');
  });
});
