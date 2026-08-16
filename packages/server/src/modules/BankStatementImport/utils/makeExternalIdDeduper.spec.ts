import { makeExternalIdDeduper } from './statementHelpers';

/**
 * И1 срез 2 (карта v12): разведение совпадающих ключей в пределах файла.
 */
describe('makeExternalIdDeduper', () => {
  it('первое вхождение ключа — без суффикса (совместимость)', () => {
    const dedupe = makeExternalIdDeduper();
    expect(dedupe('1c:5:2026-06-01:100.00')).toBe('1c:5:2026-06-01:100.00');
  });

  it('повторы того же ключа получают #2, #3 по порядку', () => {
    const dedupe = makeExternalIdDeduper();
    const base = '1c:5:2026-06-01:100.00';
    expect(dedupe(base)).toBe(base);
    expect(dedupe(base)).toBe(`${base}#2`);
    expect(dedupe(base)).toBe(`${base}#3`);
  });

  it('разные ключи не мешают счётчикам друг друга', () => {
    const dedupe = makeExternalIdDeduper();
    expect(dedupe('a')).toBe('a');
    expect(dedupe('b')).toBe('b');
    expect(dedupe('a')).toBe('a#2');
    expect(dedupe('b')).toBe('b#2');
  });

  it('детерминизм: одинаковая последовательность → одинаковые ключи (идемпотентность повторного импорта)', () => {
    const seq = ['x', 'y', 'x', 'x', 'y'];
    const run = () => {
      const dedupe = makeExternalIdDeduper();
      return seq.map(dedupe);
    };
    expect(run()).toEqual(run());
    expect(run()).toEqual(['x', 'y', 'x#2', 'x#3', 'y#2']);
  });
});
