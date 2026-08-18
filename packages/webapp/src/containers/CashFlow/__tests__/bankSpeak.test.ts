import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Сторож С1 срез 3 (карта v14): банк — самое горячее место продукта — не
 * имеет права глушить ошибки. Раньше здесь было 17 слепых «что-то пошло не
 * так» и пустые catch; разбор кода — в showApiError и едином словаре.
 */
const cashFlowDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const bankingDir = path.resolve(cashFlowDir, '..', 'Banking');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

const files = [...walk(cashFlowDir), ...walk(bankingDir)];

describe('банк говорит причину ошибки', () => {
  it('находит файлы банка (не меньше 60)', () => {
    expect(files.length).toBeGreaterThanOrEqual(60);
  });

  it.each(files.map((f) => path.relative(path.dirname(cashFlowDir), f)))(
    '%s не молчит об ошибке',
    (rel) => {
      const src = fs.readFileSync(
        path.join(path.dirname(cashFlowDir), rel),
        'utf-8',
      );
      expect(
        src,
        `${rel}: слепой тост запрещён — разбор кода в showApiError`,
      ).not.toMatch(/something_went_?wrong/);
      expect(src, `${rel}: пустой catch запрещён`).not.toMatch(
        /\.catch\(\(\w*\)? ?=> \{\s*\}\)/,
      );
    },
  );
});
