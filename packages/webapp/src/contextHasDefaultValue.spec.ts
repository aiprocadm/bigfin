import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д3 карты v57. Контекст без значения по умолчанию.
 *
 * `createContext()` без довода — законная запись во время работы: значение по
 * умолчанию становится `undefined`. Но для проверки типов такой контекст
 * получает тип «неизвестно», и **каждое** чтение из него становится ошибкой.
 *
 * 172 таких контекста давали 1116 замечаний «свойства нет у типа unknown» —
 * почти три четверти всего этого вида. Пока замечания есть, файл не может
 * выйти из-под пометки «не проверять типы», и вместе с ними в слепой зоне
 * держались сотни файлов.
 *
 * Почему сторож, а не только правка: вызывающие файлы стоят под пометкой, а
 * она отключает проверку целиком. Новый `createContext()` не вызовет ни
 * одного замечания у того, кто его добавил, — и вернёт всё обратно молча.
 *
 * Правило: у каждого `createContext` есть значение по умолчанию.
 * Если значения нет по существу — пишется явно: `createContext<any>(undefined)`.
 *
 * Проверочные файлы (`*.spec`) не смотрим: правило про продуктовый код, а в
 * пояснениях к самим сторожам запрещённая запись встречается как пример.
 */
const SRC = path.resolve(__dirname);

/** Вызов `createContext()` с пустыми скобками, включая перенос строки. */
const EMPTY_CALL = /\bcreateContext\s*(<[^>]*>)?\s*\(\s*\)/g;

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !/\.d\.ts$/.test(f) && !/\.spec\.tsx?$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

describe('контекст объявляется со значением по умолчанию', () => {
  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы — в одиночку идёт секунды, в полном прогоне вдвое
  // дольше (карта v74).
  it('нет ни одного createContext() с пустыми скобками', { timeout: 30_000 }, () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const code = fs.readFileSync(file, 'utf8');
      const hits = code.match(EMPTY_CALL);
      if (hits) {
        offenders.push(`${path.relative(SRC, file)} — ${hits.length} шт`);
      }
    }
    expect(offenders).toEqual([]);
  });

  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы — в одиночку идёт секунды, в полном прогоне вдвое
  // дольше (карта v74).
  it('файлы вообще читаются — иначе проверка бессмысленна', { timeout: 30_000 }, () => {
    const withContext = sourceFiles().filter((f) =>
      /\bcreateContext\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(withContext.length).toBeGreaterThan(100);
  });
});
