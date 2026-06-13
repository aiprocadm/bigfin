import * as fs from 'fs';
import * as path from 'path';

const loadPdf = (locale: string): Record<string, string> =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'i18n', locale, 'pdf.json'),
      'utf8',
    ),
  );

/**
 * Проверки серверного словаря PDF-документов (русификация, этап 4).
 * Лейблы PDF переводятся на языке организации в `*PdfTemplate.service.ts`.
 */
describe('pdf translations (en/ru)', () => {
  const en = loadPdf('en');
  const ru = loadPdf('ru');

  it('en и ru имеют одинаковый набор ключей (парность)', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  it('русские значения лейблов корректны', () => {
    expect(ru['label.total']).toBe('Итого');
    expect(ru['label.subtotal']).toBe('Подытог');
    expect(ru['label.line_item']).toBe('Наименование');
    expect(ru['invoice.number']).toBe('Номер счёта');
    expect(ru['invoice.balance_due']).toBe('Остаток к оплате');
  });
});
