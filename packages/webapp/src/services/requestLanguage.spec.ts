import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Р1 карты v21. Витрина спрашивает сервер на языке пользователя.
 *
 * У витрины два http-клиента, и один из них годами ставил каждому запросу
 * `Accept-Language: 'ar'` — забытая отладочная строка. Арабского словаря у
 * сервера нет, поэтому он откатывался на английский: русская организация
 * получала отчёты со строками «Assets», «Accounts Receivable», хотя весь
 * русский перевод (38 файлов, около 700 ключей) лежал готовым.
 *
 * Опечатка в одну строку обнуляла работу целой приёмки — поэтому здесь
 * сторож, а не просто правка: язык запроса нельзя зашивать константой,
 * его берут у пользователя.
 */
const SERVICES = path.resolve(__dirname);
const HOOKS = path.resolve(__dirname, '../hooks');

const httpClientFiles = (): string[] =>
  [SERVICES, HOOKS].flatMap((dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => path.join(dir, entry.name))
      .filter((file) => !file.endsWith('.spec.ts'))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('Accept-Language')),
  );

describe('витрина спрашивает сервер на языке пользователя', () => {
  const files = httpClientFiles();

  it('клиенты, задающие язык запроса, вообще нашлись', () => {
    // Иначе сломанный обход сделал бы проверку ниже пустой и зелёной.
    expect(files.length).toBeGreaterThan(0);
  });

  it('ни один клиент не зашивает язык константой', () => {
    // Ловим `= 'ar'`, `= "en"` и т.п. в строке, где присваивается язык.
    const hardcoded = files.flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line: line.trim(), no: index + 1 }))
        .filter(
          ({ line }) =>
            /Accept-Language.*=\s*['"][a-z-]{2,5}['"]/.test(line) ||
            /\blocale\s*=\s*['"][a-z-]{2,5}['"]/.test(line),
        )
        .map(({ line, no }) => `${path.basename(file)}:${no} — ${line}`),
    );

    expect(hardcoded).toEqual([]);
  });
});

describe('язык запроса берётся у пользователя', () => {
  it('берётся язык, которым отрисован интерфейс', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { getInitOptions: () => ({ currentLocale: 'ru' }) },
    }));
    vi.doMock('@/utils', () => ({ getCookie: () => 'en' }));

    const { getRequestLocale } = await import('./requestLocale');

    expect(getRequestLocale()).toBe('ru');
  });

  it('пока словари не загружены — берётся cookie', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: {
        getInitOptions: () => {
          throw new Error('словари ещё не загружены');
        },
      },
    }));
    vi.doMock('@/utils', () => ({ getCookie: (_n: string, d: string) => 'ru' }));

    const { getRequestLocale } = await import('./requestLocale');

    expect(getRequestLocale()).toBe('ru');
  });

  it('если языка не знаем — пустая строка, заголовок не ставится', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { getInitOptions: () => ({}) },
    }));
    // Значение по умолчанию из вызова: cookie нет — вернётся то, что передали.
    vi.doMock('@/utils', () => ({ getCookie: (_n: string, d: string) => d }));

    const { getRequestLocale } = await import('./requestLocale');

    expect(getRequestLocale()).toBe('');
  });
});
