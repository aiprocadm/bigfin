// © 2026 Bigfin
import moment from 'moment';
import en from './en/index.json';
import ru from './ru/index.json';
import ar from './ar/index.json';

/**
 * Форматы дат — не текст, а шаблон для библиотеки дат: «YYYY MMM DD» это
 * инструкция «год, месяц, день», а не слова для перевода.
 *
 * Один раз русский шаблон перевели буквально — «ГГГГ МММ ДД». Библиотека
 * кириллицу в шаблоне не понимает и печатала эти буквы как есть: в списке
 * счетов поставщиков вместо даты стояло «ГГГГ МММ ДД». Тест закрывает весь
 * класс: шаблон обязан оставаться шаблоном на любом языке.
 */
const LANGS: Array<[string, any]> = [
  ['en', en],
  ['ru', ru],
  ['ar', ar],
];

describe('форматы дат остаются шаблонами, а не переводятся', () => {
  const entries = LANGS.flatMap(([lang, dict]) =>
    Object.entries((dict as any).date_formats ?? {}).map(
      ([key, value]) => ({ lang, key, value: String(value) }),
    ),
  );

  it('форматы найдены во всех языках', () => {
    // Если ключ переименуют, проверка ниже позеленеет «бесплатно».
    expect(entries.length).toBeGreaterThanOrEqual(LANGS.length);
  });

  it('в шаблоне нет кириллицы и арабицы — библиотека их не понимает', () => {
    const broken = entries.filter((e) => /[Ѐ-ӿ؀-ۿ]/.test(e.value));

    expect(broken).toEqual([]);
  });

  it('шаблон действительно даёт дату, а не сам себя', () => {
    const sample = moment('2026-08-27');

    entries.forEach((entry) => {
      const formatted = sample.format(entry.value);
      // В выводе обязаны появиться цифры года — значит шаблон отработал.
      expect(formatted).toContain('2026');
      expect(formatted).not.toBe(entry.value);
    });
  });
});
