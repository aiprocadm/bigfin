import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Сторож С1 срез 2 (карта v14): подтверждающие диалоги обязаны ГОВОРИТЬ при
 * ошибке. Раньше 29 алертов молчали (`.catch(() => {})`, молчаливое закрытие)
 * или показывали безликое «что-то пошло не так» — пользователь был уверен,
 * что действие прошло.
 */
const alertsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') return walk(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });

const alertFiles = walk(alertsDir);

describe('алерты говорят причину ошибки', () => {
  it('находит файлы алертов (не меньше 40)', () => {
    expect(alertFiles.length).toBeGreaterThanOrEqual(40);
  });

  it.each(alertFiles.map((f) => path.relative(alertsDir, f)))(
    '%s не молчит об ошибке',
    (rel) => {
      const src = fs.readFileSync(path.join(alertsDir, rel), 'utf-8');
      expect(src, `${rel}: пустой catch запрещён — зовите showApiError`).not.toMatch(
        /\.catch\(\(\) => \{\s*\}\)/,
      );
      expect(
        src,
        `${rel}: слепой тост запрещён — разбор кода в showApiError`,
      ).not.toMatch(/something_went_?wrong/);
      if (/\.catch\(/.test(src)) {
        expect(src, `${rel}: catch обязан звать showApiError`).toMatch(
          /showApiError/,
        );
      }
    },
  );
});
