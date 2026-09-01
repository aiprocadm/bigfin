// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Л2 карты v34. Шапки отчётов — на языке организации.
 *
 * Отчёт «Дебиторка по срокам» рисовал шапку так:
 *
 *   CUSTOMER NAME | CURRENT | 0 - 30 | 31 - 60 | 61 - AND OVER | TOTAL
 *
 * — при том что остальное в отчёте по-русски. Подписи столбцов приходят с
 * сервера, и там они были вписаны руками: `{ label: 'Customer name' }`.
 *
 * Механизм перевода в этих же файлах есть и работает: баланс печатает
 * «НАЗВАНИЕ СТАТЬИ» через `this.i18n.t('balance_sheet.total')`. Замер:
 * переведённых подписей 47, вписанных латиницей — 52 в десяти файлах.
 */
const REPORTS = path.resolve(__dirname, '.');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!entry.name.endsWith('.ts')) return [];
    if (entry.name.endsWith('.spec.ts')) return [];
    // Примеры для документации API и схемы на экран не попадают.
    if (/swagger|\.dto\.ts$|^schema\.ts$/i.test(entry.name)) return [];
    return [full];
  });

/** Подписи столбцов, вписанные латиницей вместо словаря. */
const hardcodedLabels = () => {
  const offenders: string[] = [];

  sourceFiles(REPORTS).forEach((file) => {
    activeCode(fs.readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, index) => {
        if (!line.includes('label:') || line.includes('i18n')) return;
        const match = /label:\s*'([^']+)'/.exec(line);
        if (!match) return;

        const value = match[1];
        // Кириллица — уже перевод; «0 - 30» и подобное — не слова.
        if (/[А-Яа-яЁё]/.test(value)) return;
        if (!/[A-Za-z]{3}/.test(value)) return;

        offenders.push(
          `${path.relative(REPORTS, file)}:${index + 1} «${value}»`,
        );
      });
  });
  return offenders;
};

describe('шапки отчётов', () => {
  it('исходники отчётов читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(sourceFiles(REPORTS).length).toBeGreaterThan(50);
  });

  it('подписи столбцов не вписаны латиницей', () => {
    expect(hardcodedLabels()).toEqual([]);
  });
});
