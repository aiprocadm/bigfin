import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Р3 карты v26. Даты вводятся полем продукта, а не полем браузера.
 *
 * Системный `<input type="date">` рисует дату по правилам браузера: у
 * человека с английским браузером это `2026-01-01`, хотя организация
 * настроена на `26.08.2026`, и во всех остальных формах продукта дата
 * выглядит именно так. Один и тот же период на соседних экранах читается
 * по-разному.
 *
 * Правило: дату вводит `DateInput` с `formatDate={formatOrganizationDate}`
 * (см. `utils/organizationDate`). Экраны, заведённые до этого правила,
 * перечислены явно — это долг, список может только уменьшаться.
 */
const SRC = path.resolve(__dirname, '..');

/**
 * Экраны с системным полем даты. Долг закрыт целиком (Ж2 карты v32):
 * все семнадцать экранов перешли на поле продукта, список пуст и должен
 * таким остаться.
 */
const ALLOWED: string[] = [];

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

describe('поля даты', () => {
  const files = sourceFiles(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('даты не вводятся системным полем браузера', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const relative = path.relative(SRC, file);
      if (ALLOWED.includes(relative)) return;

      // Комментарии не считаем: они объясняют правило и упоминают
      // запрещённое по имени.
      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      if (/type=["']date["']|type=\{["']date["']\}/.test(code)) {
        offenders.push(relative);
      }
    });

    expect(offenders).toEqual([]);
  });

  it('список должников не разросся и не устарел', () => {
    // Каждый файл из списка ещё существует и ещё грешит: починенный экран
    // должен уходить из списка, а не висеть в нём вечным исключением.
    const stale = ALLOWED.filter((relative) => {
      const full = path.join(SRC, relative);
      if (!fs.existsSync(full)) return true;
      return !/type=["']date["']/.test(fs.readFileSync(full, 'utf8'));
    });

    expect(stale).toEqual([]);
  });
});
