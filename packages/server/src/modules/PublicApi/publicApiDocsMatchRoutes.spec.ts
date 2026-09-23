// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * FT-091 ТЗ-3: каждый путь из `docs/public-api.md` существует в роутере.
 *
 * Документ API описывал работающую схему, а примеры в нём вели на
 * несуществующие адреса (`/api/financial-statements/…`, `/api/transactions`).
 * Интегратор копирует пример — и получает 404 от документации продукта.
 */
const ROOT = path.resolve(__dirname, '..');
const DOC = path.resolve(__dirname, '../../../../../docs/public-api.md');

const controllers = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllers(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

const clean = (p: string) => p.replace(/^\/+|\/+$/g, '');

/** Маршруты сервера: «МЕТОД путь», параметры `:id` — как шаблон. */
export function routesOf(source: string): { method: string; pattern: RegExp; raw: string }[] {
  const code = activeCode(source);
  const base = code.match(/@Controller\(\s*['"`]([^'"`]*)['"`]/)?.[1] ?? '';
  const out: { method: string; pattern: RegExp; raw: string }[] = [];
  for (const m of code.matchAll(/@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g)) {
    const raw = [clean(base), clean(m[2] ?? '')].filter(Boolean).join('/');
    const pattern = new RegExp(
      '^' + raw.split('/').map((part) => (part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$',
    );
    out.push({ method: m[1].toUpperCase(), pattern, raw });
  }
  return out;
}

/** Пути из документа: адреса `…/api/…` в примерах и `rawRequest(…)`. */
export function docPaths(doc: string): { method: string; path: string }[] {
  const found: { method: string; path: string }[] = [];
  for (const block of doc.match(/```[\s\S]*?```/g) ?? []) {
    for (const m of block.matchAll(/(?:curl(?:\s+-X\s+(\w+))?\s+)?https?:\/\/[^\s'"`]+?\/api\/([^\s'"`?\\]+)/g)) {
      found.push({ method: (m[1] ?? 'GET').toUpperCase(), path: clean(m[2]) });
    }
  }
  for (const m of doc.matchAll(/rawRequest\([^,]+,\s*'(\w+)',\s*'\/api\/([^']+)'/g)) {
    found.push({ method: m[1].toUpperCase(), path: clean(m[2]) });
  }
  return found;
}

describe('документ публичного API совпадает с роутером', () => {
  const routes = controllers(ROOT).flatMap((file) => routesOf(fs.readFileSync(file, 'utf8')));
  const paths = docPaths(fs.readFileSync(DOC, 'utf8'));

  it('разбор видит маршруты и пути документа', () => {
    expect(routes.length).toBeGreaterThan(300);
    expect(paths.length).toBeGreaterThanOrEqual(4);
  });

  it('каждый путь из документа — существующая ручка с тем же методом', () => {
    const missing = paths.filter(
      ({ method, path: p }) => !routes.some((r) => r.method === method && r.pattern.test(p)),
    );
    expect(missing).toEqual([]);
  });

  it('несуществующий путь ловится (проверка самого сторожа)', () => {
    const [bad] = docPaths('```bash\ncurl https://x.ru/api/financial-statements/balance-sheet\n```');
    expect(routes.some((r) => r.method === bad.method && r.pattern.test(bad.path))).toBe(false);
  });
});
