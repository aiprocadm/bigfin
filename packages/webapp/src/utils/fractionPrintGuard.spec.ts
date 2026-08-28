import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * З3 карты v37. Дробь печатается знаком организации, а не языком JS.
 *
 * `value.toFixed(2)` всегда даёт точку: «1.75», «12.5 %». В русском
 * продукте, где рядом стоит «1 000,50 ₽», это выглядит так, будто числа
 * писали два разных продукта. Печатник у продукта есть —
 * `formatOrganizationNumber` (знаки берёт у организации, как и суммы).
 *
 * Правило: `toFixed` с дробной частью в разметке не зовут. Округление до
 * целого (`toFixed(0)`) точки не даёт и остаётся разрешённым.
 */
const SRC = path.resolve(__dirname, '..');

/** Печатники, которым `toFixed` положен по делу. */
const ALLOWED = ['utils/organizationNumber.ts'];

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    if (/\.stories\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

describe('печать дробных чисел', () => {
  const files = sourceFiles(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('дробь не печатается через toFixed в обход формата организации', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const relative = path.relative(SRC, file);
      if (ALLOWED.includes(relative)) return;

      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        // Комментарии объясняют правило и упоминают запрещённое по имени.
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      if (/\.toFixed\(\s*[1-9]/.test(code)) offenders.push(relative);
    });

    expect(offenders).toEqual([]);
  });
});
