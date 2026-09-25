import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { cn, TYPE_SCALE } from '../cn';

/**
 * Склейщик классов не теряет размер шрифта из шкалы v2.
 *
 * Живой проход этапа 45 ТЗ-4: `cn('text-title-2 text-text-primary')` давал
 * `text-text-primary` — размер принимался за цвет и выбрасывался.
 */
describe('cn и шрифтовая шкала', () => {
  it('размер шкалы и цвет текста живут рядом', () => {
    expect(cn('text-title-2 text-text-primary md:text-large-title')).toBe(
      'text-title-2 text-text-primary md:text-large-title',
    );
    expect(cn('text-headline', 'text-danger')).toBe('text-headline text-danger');
  });

  it('два размера — побеждает последний, как у размеров Tailwind', () => {
    expect(cn('text-body', 'text-headline')).toBe('text-headline');
    expect(cn('text-sm', 'text-footnote')).toBe('text-footnote');
  });

  it('список шкалы совпадает со стилями', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../styles/globals.css'), 'utf8');
    const declared = [...css.matchAll(/^\s*--text-([a-z0-9-]+):/gm)]
      .map((m) => m[1])
      .filter((name) => !name.includes('--'));
    expect([...TYPE_SCALE].sort()).toEqual([...new Set(declared)].sort());
  });
});
