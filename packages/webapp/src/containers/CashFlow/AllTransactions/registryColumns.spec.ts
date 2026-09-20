// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REGISTRY_COLUMNS,
  isColumnRemovable,
  toggleRegistryColumn,
  visibleRegistryColumns,
} from './registryColumns';

/**
 * Состав колонок реестра операций (T-34 ТЗ-2).
 *
 * Требование ТЗ дословно: «"Дата" и "Сумма" не снимаются; экспорт полный».
 * Оба правила легко нарушить незаметно, и оба нарушения тихие: экран без
 * даты выглядит поломкой, а неполный файл человек обнаружит уже в Excel.
 */
const COLUMNS = [
  { id: 'date' },
  { id: 'contact' },
  { id: 'note' },
  { id: 'type' },
  { id: 'state' },
  { id: 'account' },
  { id: 'amount' },
];

describe('колонки реестра операций', () => {
  it('«Дата» и «Сумма» НЕ СНИМАЮТСЯ', () => {
    expect(isColumnRemovable('date')).toBe(false);
    expect(isColumnRemovable('amount')).toBe(false);
  });

  it('остальные снимаются', () => {
    expect(isColumnRemovable('note')).toBe(true);
    expect(isColumnRemovable('account')).toBe(true);
  });

  it('попытка снять обязательную НИЧЕГО НЕ МЕНЯЕТ', () => {
    // Молча «переключить и тут же вернуть» нельзя: галочка мигнула бы, и
    // человек решил бы, что продукт его не слушает.
    const before = { ...DEFAULT_REGISTRY_COLUMNS };
    const after = toggleRegistryColumn(before, 'date');

    expect(after).toBe(before);
  });

  it('обычная колонка переключается', () => {
    const after = toggleRegistryColumn(DEFAULT_REGISTRY_COLUMNS, 'note');

    expect(after.note).toBe(false);
  });

  it('снятая колонка ИСЧЕЗАЕТ из таблицы', () => {
    const visible = visibleRegistryColumns(COLUMNS, {
      ...DEFAULT_REGISTRY_COLUMNS,
      note: false,
    });

    expect(visible.map((column) => column.id)).not.toContain('note');
  });

  it('обязательные остаются, даже если их выключили в настройках', () => {
    // Настройка из будущей версии не должна ломать экран.
    const visible = visibleRegistryColumns(COLUMNS, {
      date: false,
      amount: false,
    });

    expect(visible.map((column) => column.id)).toEqual(
      expect.arrayContaining(['date', 'amount']),
    );
  });

  it('НОВАЯ колонка показывается, а не прячется', () => {
    // Молчание сохранённой настройки — это «человек не выбирал», а не
    // «выключил». Иначе каждая новая колонка появлялась бы невидимой.
    const visible = visibleRegistryColumns(
      [...COLUMNS, { id: 'brand-new' }],
      DEFAULT_REGISTRY_COLUMNS,
    );

    expect(visible.map((column) => column.id)).toContain('brand-new');
  });

  it('по умолчанию видно всё', () => {
    const visible = visibleRegistryColumns(COLUMNS, DEFAULT_REGISTRY_COLUMNS);

    expect(visible).toHaveLength(COLUMNS.length);
  });

  it('пустой список не роняет отбор', () => {
    expect(visibleRegistryColumns([], DEFAULT_REGISTRY_COLUMNS)).toEqual([]);
  });
});
