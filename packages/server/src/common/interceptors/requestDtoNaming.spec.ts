// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * М3 срез 2 (карта v15). Глобальный перехватчик переименовывает ВХОДЯЩИЕ
 * параметры и тело запроса из `from_currency` в `fromCurrency`
 * (`serialize.interceptor.ts`). Если поле описания запроса объявлено в
 * snake_case, значение не совпадает с именем поля и проверка молча его
 * выбрасывает: пользователь заполнил, а сервер не увидел.
 *
 * Так терялись валюты в запросе курса и телефон филиала. Сторож ловит
 * такие поля во всех описаниях запросов сразу.
 */
const MODULES = path.resolve(__dirname, '../../modules');

/** Ответы наружу, наоборот, ОБЯЗАНЫ быть в snake_case — их не трогаем. */
const isResponseDto = (file: string) => /Response\.dto\.ts$/.test(file);

const collectDtoFiles = (dir: string): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectDtoFiles(full));
    } else if (entry.name.endsWith('.dto.ts') && !isResponseDto(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

/** Объявления полей класса вида `  some_field?: string;`. */
const SNAKE_FIELD = /^\s{2}([a-z][a-z0-9]*_[a-z0-9_]+)\??\s*[!]?\s*:/gm;

describe('имена полей во входящих описаниях запросов', () => {
  const files = collectDtoFiles(MODULES);

  it('описания запросов вообще нашлись', () => {
    // Иначе пустой список сделал бы проверку ниже бессмысленно зелёной.
    expect(files.length).toBeGreaterThan(50);
  });

  it('ни одно поле не объявлено в snake_case', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');

      for (const match of source.matchAll(SNAKE_FIELD)) {
        offenders.push(`${path.relative(MODULES, file)}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
