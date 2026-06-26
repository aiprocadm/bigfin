import { describe, it, expect } from 'vitest';
import { computeVirtualWindow } from './data-table';

describe('computeVirtualWindow', () => {
  const base = { viewportHeight: 400, rowHeight: 40, rowCount: 100, overscan: 0 };

  it('верх списка: scrollTop=0 показывает первые строки', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 0 });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(10); // ceil(400/40)
    expect(w.padTop).toBe(0);
    expect(w.padBottom).toBe(90 * 40);
  });

  it('середина: сдвигает окно по scrollTop', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 400 });
    expect(w.startIndex).toBe(10); // floor(400/40)
    expect(w.endIndex).toBe(20); // ceil((400+400)/40)
    expect(w.padTop).toBe(10 * 40);
  });

  it('низ: endIndex клампится по rowCount', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 100000 });
    expect(w.endIndex).toBe(100);
    expect(w.padBottom).toBe(0);
  });

  it('overscan расширяет окно в обе стороны', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 400, overscan: 3 });
    expect(w.startIndex).toBe(7); // 10 - 3
    expect(w.endIndex).toBe(23); // 20 + 3
  });

  it('инвариант: padTop + видимые*rowHeight + padBottom = rowCount*rowHeight', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 400, overscan: 5 });
    const middle = (w.endIndex - w.startIndex) * base.rowHeight;
    expect(w.padTop + middle + w.padBottom).toBe(base.rowCount * base.rowHeight);
  });

  it('пустой список: всё по нулям', () => {
    const w = computeVirtualWindow({ ...base, rowCount: 0, scrollTop: 0 });
    expect(w).toEqual({ startIndex: 0, endIndex: 0, padTop: 0, padBottom: 0 });
  });
});
