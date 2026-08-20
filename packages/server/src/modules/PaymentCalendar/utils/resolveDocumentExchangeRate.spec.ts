// © 2026 Bigfin
import { resolveDocumentExchangeRate } from './resolveDocumentExchangeRate';

/**
 * Р1 срез 1 (карта v16): в платёжном календаре стояло «курс документа ИЛИ
 * единица». Для документа в базовой валюте единица законна — курса у него
 * нет. А вот валютный документ без курса единица превращала в рубли один к
 * одному и молча завышала прогноз.
 *
 * Правило продукта: молчаливой единицы быть не должно — либо честный курс,
 * либо честное «пересчитать нечем».
 */
describe('курс документа в платёжном календаре', () => {
  it('документ в базовой валюте — курс единица, это законно', () => {
    expect(resolveDocumentExchangeRate('RUB', 'RUB', null)).toBe(1);
  });

  it('валюта не указана вовсе — считаем базовой', () => {
    expect(resolveDocumentExchangeRate(null, 'RUB', null)).toBe(1);
  });

  it('валютный документ с курсом — берём его курс', () => {
    expect(resolveDocumentExchangeRate('USD', 'RUB', 92.5)).toBe(92.5);
  });

  it('валютный документ БЕЗ курса — пересчитать нечем', () => {
    // Раньше здесь молча получалась единица: доллар равнялся рублю.
    expect(resolveDocumentExchangeRate('USD', 'RUB', null)).toBeNull();
    expect(resolveDocumentExchangeRate('USD', 'RUB', 0)).toBeNull();
  });

  it('отрицательный или нечисловой курс — тоже нечем', () => {
    expect(resolveDocumentExchangeRate('USD', 'RUB', -5)).toBeNull();
    expect(resolveDocumentExchangeRate('USD', 'RUB', 'ерунда' as any)).toBeNull();
  });

  it('курс в виде строки понимается', () => {
    // Базы отдают decimal строкой — иначе честный курс стал бы «нечем».
    expect(resolveDocumentExchangeRate('USD', 'RUB', '92.5' as any)).toBe(92.5);
  });
});
