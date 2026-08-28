// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * П3 карты v36. Доли задаются строками, а не JSON.
 *
 * «Ручные доли» вводились в моноширинное поле текстом вида
 * `{"12": 1, "15": 3}`, а ошибка звучала «Введите корректный JSON (ID
 * сделки → вес)». Продукт для предпринимателя без бухгалтерского
 * образования не должен просить писать JSON и внутренние номера сделок:
 * сделка выбирается по названию, вес вводится числом.
 */
const DIALOG = path.resolve(__dirname, 'CostAllocationRuleDialog.tsx');

const source = () => fs.readFileSync(DIALOG, 'utf-8');

const dictionary = (locale: string) =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, `../../lang/${locale}/index.json`),
      'utf-8',
    ),
  ) as Record<string, string>;

describe('ручные доли вводятся строками', () => {
  it('диалог не разбирает введённое как JSON', () => {
    expect(source()).not.toContain('JSON.parse');
  });

  it('в диалоге нет моноширинного поля для долей', () => {
    expect(source()).not.toMatch(/<textarea[\s\S]{0,400}font-mono/);
  });

  it('доли задаются отдельным полем строк', () => {
    expect(source()).toContain('<ManualSharesField');
  });

  it.each(['ru', 'en'])('подписи долей (%s) не упоминают JSON', (locale) => {
    const d = dictionary(locale);
    const texts = Object.entries(d)
      .filter(([key]) => key.includes('manual_shares'))
      .map(([, value]) => value);

    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toMatch(/JSON/i);
      expect(text).not.toMatch(/\bID\b|dealId/i);
    }
  });
});
