import { describe, it, expect } from 'vitest';
import { unwrapData } from '../unwrapData';

describe('распаковка ответа', () => {
  it('снимает обёртку, когда сервер её присылает', () => {
    expect(unwrapData({ data: { data: [1, 2] } })).toEqual([1, 2]);
  });

  it('отдаёт массив как есть, когда обёртки нет', () => {
    // Именно здесь списки и пустовали: `res.data.data` давал undefined.
    expect(unwrapData({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('отдаёт объект как есть, когда обёртки нет', () => {
    expect(unwrapData({ data: { stages: [], summary: {} } })).toEqual({
      stages: [],
      summary: {},
    });
  });

  it('не путает поле data внутри самой сущности', () => {
    // У ответа-объекта поле `data` — это и есть полезная часть.
    expect(unwrapData({ data: { data: { id: 7 } } })).toEqual({ id: 7 });
  });

  it('пустой ответ не ломает распаковку', () => {
    expect(unwrapData(undefined)).toBeUndefined();
    expect(unwrapData({})).toBeUndefined();
    expect(unwrapData({ data: null })).toBeNull();
  });

  it('пустой массив остаётся пустым массивом, а не пропадает', () => {
    expect(unwrapData({ data: [] })).toEqual([]);
  });

  it('скалярный ответ возвращается как есть', () => {
    expect(unwrapData({ data: 'ок' })).toBe('ок');
    expect(unwrapData({ data: 42 })).toBe(42);
  });

  it('null внутри обёртки сохраняется', () => {
    expect(unwrapData({ data: { data: null } })).toBeNull();
  });
});
