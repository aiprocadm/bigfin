// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Набор сквозных сценариев — под присмотром (раздел 14.7 ТЗ-2).
 *
 * ГЛАВНАЯ ДЫРА СТРАХОВКИ, найденная ТЗ: в прогоне участвовал ОДИН файл
 * (`authentication.spec.ts`), а `items.spec.ts` состоял из пустых тестов
 * с телом `() => {}`. Такие тесты проходят зелёными всегда. Отсутствие
 * теста видно, зелёная галочка — успокаивает.
 *
 * Сами сценарии здесь не выполняются: для них нужны поднятый продукт и
 * данные. Проверяется то, что можно проверить всегда, — что список
 * сценариев не усох и что в нём нет пустышек.
 */
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const E2E_DIR = path.join(ROOT, 'e2e');
const CONFIG = path.join(ROOT, 'playwright.config.ts');

const config = fs.readFileSync(CONFIG, 'utf8');

/** Файлы сценариев, объявленные в настройке прогона. */
const declared = (): string[] => {
  const match = config.match(/testMatch:\s*\[([\s\S]*?)\]/);
  if (!match) return [];

  return [...match[1].matchAll(/'([^']+\.spec\.ts)'/g)].map((m) => m[1]);
};

const readSpec = (name: string): string =>
  fs.readFileSync(path.join(E2E_DIR, name), 'utf8');

describe('сквозные сценарии', () => {
  it('в прогоне участвует не один файл', () => {
    // Было ровно так: один файл на весь продукт.
    expect(declared().length).toBeGreaterThanOrEqual(5);
  });

  it('каждый объявленный файл существует', () => {
    const missing = declared().filter(
      (name) => !fs.existsSync(path.join(E2E_DIR, name)),
    );

    expect(missing).toEqual([]);
  });

  it('суточный сценарий объявлен', () => {
    // Это путь, которым человек ходит каждый день; без него прогон
    // проверяет всё, кроме главного.
    expect(declared()).toContain('daily-flow.spec.ts');
  });

  it('НИ ОДНОГО ПУСТОГО ТЕСТА', () => {
    // `test('…', () => {})` — зелёная галочка, за которой ничего нет.
    const offenders = declared().flatMap((name) => {
      const source = readSpec(name);
      const empty = [
        ...source.matchAll(/test\(\s*'[^']*'\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*\}\s*\)/g),
      ];

      return empty.length ? [name] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('в каждом сценарии есть хотя бы одна проверка', () => {
    const withoutExpect = declared().filter(
      (name) => !readSpec(name).includes('expect('),
    );

    expect(withoutExpect).toEqual([]);
  });

  it('сценарии не зашивают пароль в исходник', () => {
    // Пароль в файле репозитория — это пароль, опубликованный навсегда.
    const offenders = declared().filter((name) =>
      /password\s*[:=]\s*'[^']+'/i.test(readSpec(name)),
    );

    expect(offenders).toEqual([]);
  });

  it('проверка ловит подделку', () => {
    // Мутация: сторож, который ничего не ловит, хуже отсутствующего.
    const fake = "test('should save the item successfully.', () => {});";

    expect(
      /test\(\s*'[^']*'\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*\}\s*\)/.test(
        fake,
      ),
    ).toBe(true);
  });
});
