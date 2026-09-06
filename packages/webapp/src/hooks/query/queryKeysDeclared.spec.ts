import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д4 карты v55. Ключ кэша, которого нет.
 *
 * Каждый запрос к серверу подписан ключом — `t.SOMETHING` из
 * `hooks/query/types.tsx`. По этому ключу ответ кладётся в память и по нему же
 * сбрасывается, когда данные поменялись.
 *
 * Если такого ключа в объявлениях нет, `t.SOMETHING` молча выходит пустым
 * (`undefined`). Ошибки не будет: запрос сработает, ответ ляжет в память — но
 * под ключом `[undefined, id]`. Дальше два разных запроса с двумя разными
 * опечатками начинают делить одну ячейку памяти, а сброс после правки данных
 * промахивается мимо неё.
 *
 * Так было в трёх местах:
 *  - `t.ITEM_CATEGORY` — карточка категории товаров;
 *  - `t.SETTING_WAREHOUSE_TRANSFERS` — настройки перемещений между складами;
 *  - `t.VENDOR_CREDIT_NOTE` — сброс после удаления кредит-ноты поставщика
 *    (там ключ был не просто не объявлен, а ещё и не тот: остальные семь мест
 *    в том же файле пишут `t.VENDOR_CREDIT`).
 *
 * Правило: каждое имя, использованное как `t.ИМЯ` в `hooks/query`, объявлено
 * в `types.tsx`.
 */
const QUERY_DIR = path.resolve(__dirname);
const TYPES_FILE = path.join(QUERY_DIR, 'types.tsx');

/** Имена ключей, объявленные в types.tsx. */
const declaredKeys = (): Set<string> => {
  const code = fs.readFileSync(TYPES_FILE, 'utf8');
  return new Set([...code.matchAll(/^\s{2}(\w+):\s*'/gm)].map((m) => m[1]));
};

/** Все файлы запросов, кроме самих объявлений и проверок. */
const queryFiles = (): string[] =>
  fs
    .readdirSync(QUERY_DIR, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.spec\.tsx?$/.test(f))
    .map((f) => path.join(QUERY_DIR, f))
    .filter((f) => f !== TYPES_FILE && fs.statSync(f).isFile());

/** Использования вида `t.ИМЯ`. */
const usedKeys = (file: string): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  // берём только файлы, которые действительно ввозят объявления как `t`
  if (!/^import\s+t\s+from\s+'\.\.?\/.*types'/m.test(code)) return [];
  return [...code.matchAll(/\bt\.([A-Z][A-Z0-9_]*)\b/g)].map((m) => m[1]);
};

describe('ключи кэша запросов', () => {
  it('каждое использованное имя ключа объявлено в types.tsx', () => {
    const declared = declaredKeys();
    const unknown: string[] = [];

    for (const file of queryFiles()) {
      for (const key of usedKeys(file)) {
        if (!declared.has(key)) {
          unknown.push(`${path.relative(QUERY_DIR, file)}: t.${key}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it('объявления вообще читаются — иначе проверка бессмысленна', () => {
    expect(declaredKeys().size).toBeGreaterThan(100);
  });
});
