// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * П2 карты v36. Счёт выбирают из списка, а не вписывают номером.
 *
 * Три экрана интеграций просили «ID денежного счёта Bigfin» простой
 * строкой ввода. Взять это число человеку негде: внутренний номер счёта
 * нигде в интерфейсе не показан. Продукт для предпринимателя не должен
 * просить свои внутренние номера — счёт выбирается по названию.
 */
const FILES = [
  'OnecExport/OnecExportPage.tsx',
  'Zenmoney/ZenmoneyPage.tsx',
  'BankApiSync/ImportStatementForm.tsx',
];

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, rel), 'utf-8');

const dictionary = (locale: string) =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, `../lang/${locale}/index.json`),
      'utf-8',
    ),
  ) as Record<string, string>;

const ACCOUNT_KEYS = [
  'onec_export.account_id',
  'zenmoney.import.account_id',
  'bank_api.import.account_id',
];

describe('счёт интеграции выбирается из списка', () => {
  it.each(FILES)('%s не просит вписать номер счёта руками', (rel) => {
    const source = read(rel);

    expect(source).not.toMatch(/<Input[^>]*value=\{accountId\}/);
  });

  it.each(FILES)('%s показывает выбор денежного счёта', (rel) => {
    expect(read(rel)).toContain('<CashAccountField');
  });

  it.each(ACCOUNT_KEYS)('подпись «%s» не говорит про ID', (key) => {
    for (const locale of ['ru', 'en']) {
      expect(dictionary(locale)[key]).toBeTruthy();
      expect(dictionary(locale)[key]).not.toMatch(/\bID\b/i);
    }
  });
});
