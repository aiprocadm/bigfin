import { describe, it, expect } from 'vitest';
import { selectRowsByIds } from './selectRowsByIds';

const rows = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
  { id: 3, name: 'c' },
];
const byId = (r: { id: number }) => String(r.id);

describe('selectRowsByIds', () => {
  it('возвращает строки, чьи row-id попали в выбор', () => {
    expect(selectRowsByIds(rows, ['1', '3'], byId)).toEqual([
      { id: 1, name: 'a' },
      { id: 3, name: 'c' },
    ]);
  });

  it('пустой выбор → пустой массив', () => {
    expect(selectRowsByIds(rows, [], byId)).toEqual([]);
  });

  it('null/undefined вместо строк → пустой массив (без падения)', () => {
    expect(selectRowsByIds(null, ['1'], byId)).toEqual([]);
    expect(selectRowsByIds(undefined, ['1'], byId)).toEqual([]);
  });

  it('id, которых нет в данных, игнорируются', () => {
    expect(selectRowsByIds(rows, ['99'], byId)).toEqual([]);
  });

  it('сопоставление по строковому виду id (примитив отдаёт строки)', () => {
    // getRowId приводит число к строке — значит выбор '2' должен найти {id: 2}.
    expect(selectRowsByIds(rows, ['2'], byId)).toEqual([{ id: 2, name: 'b' }]);
  });

  it('поддерживает составной row-id (вкладка «Все»)', () => {
    const composite = [
      { reference_type: 'a', reference_id: 1, v: 'x' },
      { reference_type: 'b', reference_id: 2, v: 'y' },
    ];
    const compositeId = (r: any) => `${r.reference_type}-${r.reference_id}`;
    expect(selectRowsByIds(composite, ['b-2'], compositeId)).toEqual([
      { reference_type: 'b', reference_id: 2, v: 'y' },
    ]);
  });
});
