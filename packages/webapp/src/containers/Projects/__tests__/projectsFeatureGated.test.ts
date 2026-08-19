import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Сторож М2 (карта v15): «проект» — прежнее имя сделки, и хук useProjects
 * бьёт в ту же ручку, что и useDeals. Ручка закрыта флагом модуля, поэтому
 * запрос без проверки флага даёт 403 и красное «нет прав» на странице, к
 * сделкам отношения не имеющей.
 *
 * Ревью нашло ровно это: греп по useDeals пропустил второй, легаси-хук.
 */
const SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name.startsWith('__')
        ? []
        : walk(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

/** Код без комментариев: упоминание хука в пояснении — не вызов. */
const code = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** Файлы, которые ВЫЗЫВАЮТ хук (объявление и реэкспорт не в счёт). */
const callers = walk(SRC).filter((file) => {
  const src = code(fs.readFileSync(file, 'utf-8'));
  if (/export function useProjects|export const useProjects/.test(src)) {
    return false;
  }
  return /useProjects\s*\(/.test(src);
});

describe('запросы списка сделок закрыты флагом модуля', () => {
  it('вызовы useProjects найдены', () => {
    expect(callers.length).toBeGreaterThan(3);
  });

  it.each(callers.map((f) => path.relative(SRC, f)))(
    '%s спрашивает флаг перед запросом',
    (rel) => {
      const src = code(fs.readFileSync(path.join(SRC, rel), 'utf-8'));

      expect(
        src,
        `${rel}: useProjects без проверки Features.Projects — страница получит 403`,
      ).toMatch(/Features\.Projects/);
    },
  );
});
