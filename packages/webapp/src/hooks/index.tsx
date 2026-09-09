import React, { useRef, useEffect, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import useAutofocus from './useAutofocus';
import { useLocalStorage } from './utils/useLocalStorage';

export * from './utils';
export * from './useQueryString';

export function useIsValuePassed<T>(value: T, compatatorValue: T) {
  const cache = useRef([value]);

  useEffect(() => {
    if (cache.current.indexOf(value) === -1) {
      cache.current.push(value);
    }
  }, [value]);

  return cache.current.indexOf(compatatorValue) !== -1;
}

/**
 * Куда ставить точку ввода: пара «колонка, строка», записанная списком.
 */
const isCurrentFocus = (
  autoFocus: unknown,
  columnId: string,
  rowIndex: number,
) => {
  let _columnId;
  let _rowIndex;

  if (Array.isArray(autoFocus)) {
    _columnId = autoFocus[0];
    _rowIndex = autoFocus[1] || 0;
  }
  _rowIndex = parseInt(_rowIndex, 10);

  return columnId === _columnId && _rowIndex === rowIndex;
};

export function useCellAutoFocus(
  // Ссылка ведёт на то, что умеет принимать точку ввода: и узел разметки, и
  // поле Blueprint подходят.
  ref: React.MutableRefObject<{ focus: () => void } | null | undefined>,
  autoFocus: unknown,
  columnId: string,
  rowIndex: number,
) {
  const focus = useMemo(
    () => isCurrentFocus(autoFocus, columnId, rowIndex),
    [autoFocus, columnId, rowIndex],
  );
  useEffect(() => {
    if (ref.current && focus) {
      ref.current.focus();
    }
  }, [ref, focus]);

  return ref;
}

export { useAutofocus };

export function useMemorizedColumnsWidths(tableName: string) {
  const [get, save] = useLocalStorage(`${tableName}.columns_widths`, {});

  const handleColumnResizing = (
    current: unknown,
    columnWidth: unknown,
    columnsResizing: { columnWidths: Record<string, number> },
  ) => {
    save(columnsResizing.columnWidths);
  };
  return [get, save, handleColumnResizing];
}