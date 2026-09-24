import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';
import { MINUS, signedAmount } from './amountSign';

/**
 * UI-042-8 ТЗ-4. НАЙДЕНО ЖИВЫМ ПРОХОДОМ: в реестре приход и расход по
 * 500 000 выглядели одинаково — различались только цветом.
 */
describe('сумма строки реестра со знаком', () => {
  it('приход — плюс, расход — типографский минус', () => {
    expect(signedAmount('500 000,00', true)).toBe('+500 000,00');
    expect(signedAmount('500 000,00', false)).toBe(`${MINUS}500 000,00`);
  });

  it('знак уже стоит — второй не добавляется', () => {
    expect(signedAmount('-12,00', false)).toBe('-12,00');
    expect(signedAmount(`${MINUS}12,00`, false)).toBe(`${MINUS}12,00`);
  });

  it('пусто — прочерк', () => {
    expect(signedAmount(null, true)).toBe('—');
    expect(signedAmount('', false)).toBe('—');
  });

  it.each([
    'useAllTransactionsColumns.tsx',
    'useUncategorizedColumns.tsx',
    'AllTransactionsPage.tsx',
  ])('%s показывает сумму через signedAmount', (file) => {
    const code = activeCode(
      fs.readFileSync(path.join(__dirname, file), 'utf8'),
    );

    expect(code).toContain('signedAmount(');
  });
});
