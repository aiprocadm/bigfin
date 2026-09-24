import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * UI-042-2 ТЗ-4. НАЙДЕНО ЖИВЫМ ПРОХОДОМ: на телефоне галочки «Доля от итога»,
 * «Пустые строки» были высокими столбиками, отмеченная — чёрной полосой.
 * Правило «кнопка на телефоне не ниже 44 px» задевало и галочку: в ките она
 * тоже `button` (Radix), и квадрат 16×16 растягивался в 16×44.
 */
const CSS = fs
  .readFileSync(path.join(__dirname, 'globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('правило 44 px не растягивает галочки', () => {
  const rule = CSS.match(/@media \(max-width: 767px\)\s*\{([\s\S]*?min-height:\s*44px)/);

  it('правило на месте', () => {
    expect(rule).not.toBeNull();
  });

  it.each(['checkbox', 'switch', 'radio'])('%s исключён из правила', (role) => {
    expect(rule![1]).toMatch(
      new RegExp(`\\.bigfin-ui button(:not\\(\\[role='\\w+'\\]\\))*:not\\(\\[role='${role}'\\]\\)`),
    );
  });
});
