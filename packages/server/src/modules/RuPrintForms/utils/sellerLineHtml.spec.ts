// © 2026 Bigfin
import { buildSellerLine } from './ruFormMapping';

/**
 * Найдено живой пробой акта сверки на стенде: в строке «Организация»
 * печаталась РАЗМЕТКА, да ещё экранированная —
 * «Демо-организация, &lt;strong&gt;Демо-организация&lt;/strong&gt;&lt;br /&gt;Russia».
 *
 * Причина: `addressTextFormatted` в метаданных хранится с html-тегами, а
 * реквизиты подставляли его как есть. Касается ВСЕХ печатных форм РФ —
 * счёта на оплату, акта, УПД, ТОРГ-12, счёта-фактуры и акта сверки.
 */
describe('реквизиты организации в печатных формах', () => {
  it('в строку не попадают html-теги', () => {
    const line = buildSellerLine({
      name: 'Демо-организация',
      inn: '7707083893',
      addressTextFormatted:
        '<strong>Демо-организация</strong><br />г. Москва, ул. Ленина, д. 1<br />Russia',
    });

    expect(line).not.toMatch(/<[^>]+>/);
    expect(line).toContain('Демо-организация');
    expect(line).toContain('ИНН 7707083893');
    expect(line).toContain('г. Москва, ул. Ленина, д. 1');
  });

  it('название организации не повторяется дважды', () => {
    // Адрес приходит вместе с названием в начале — его нужно отрезать,
    // иначе выходит «Демо-организация, Демо-организация, Россия».
    const line = buildSellerLine({
      name: 'ООО «Ромашка»',
      addressTextFormatted: '<strong>ООО «Ромашка»</strong><br />Россия',
    });

    expect(line.match(/ООО «Ромашка»/g)?.length).toBe(1);
  });

  it('структурный адрес имеет приоритет над разметкой', () => {
    const line = buildSellerLine({
      name: 'ООО «Ромашка»',
      address: { postalCode: '101000', city: 'Москва', address1: 'ул. Ленина, 1' },
      addressTextFormatted: '<strong>ООО «Ромашка»</strong><br />Россия',
    });

    expect(line).toContain('101000');
    expect(line).toContain('Москва');
    expect(line).not.toContain('Россия');
  });

  it('пустые реквизиты не оставляют висящих запятых', () => {
    const line = buildSellerLine({ name: 'ИП Иванов' });

    expect(line).toBe('ИП Иванов');
  });
});
