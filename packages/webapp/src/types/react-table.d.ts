/**
 * Объявления для `react-table` v7 — плагины и свои свойства колонок.
 *
 * Готовые типы из `@types/react-table` описывают **голую** таблицу. Всё, что
 * добавляют плагины (`useExpanded`, `useSortBy`, `useRowSelect`, …), пакет
 * намеренно оставляет объявить самому: иначе пришлось бы держать в одном типе
 * свойства, которых при другом наборе плагинов нет.
 *
 * Из-за этого код витрины, читающий `row.isExpanded` или `column.align`, не
 * проходил проверку типов вовсе — и файлы таблиц оставались под пометкой
 * «не проверять типы» (Д1 карты v81).
 *
 * Приём — тот, что описан в самом `@types/react-table` (`react-table-config.d.ts`).
 */
import type * as React from 'react';
import {
  UseExpandedInstanceProps,
  UseExpandedOptions,
  UseExpandedRowProps,
  UseExpandedState,
  UsePaginationInstanceProps,
  UsePaginationOptions,
  UsePaginationState,
  UseResizeColumnsColumnOptions,
  UseResizeColumnsColumnProps,
  UseResizeColumnsOptions,
  UseResizeColumnsState,
  UseRowSelectHooks,
  UseRowSelectInstanceProps,
  UseRowSelectOptions,
  UseRowSelectRowProps,
  UseRowSelectState,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
} from 'react-table';

declare module 'react-table' {
  /**
   * Свойства, которые витрина передаёт таблице «насквозь» — они попадают прямо
   * на узел разметки. Готовый тип разрешает только `style`, `className`, `key`
   * и `role`, а `getCellProps` на деле пропускает что угодно.
   */
  export interface TableCommonProps {
    tabIndex?: number;
    onClick?: React.MouseEventHandler;
  }

  export interface TableOptions<D extends object>
    extends UseExpandedOptions<D>,
      UsePaginationOptions<D>,
      UseResizeColumnsOptions<D>,
      UseRowSelectOptions<D>,
      UseSortByOptions<D>,
      Record<string, any> {}

  export interface Hooks<D extends object = {}> extends UseRowSelectHooks<D> {}

  export interface TableInstance<D extends object = {}>
    extends UseExpandedInstanceProps<D>,
      UsePaginationInstanceProps<D>,
      UseRowSelectInstanceProps<D>,
      UseSortByInstanceProps<D> {}

  export interface TableState<D extends object = {}>
    extends UseExpandedState<D>,
      UsePaginationState<D>,
      UseResizeColumnsState<D>,
      UseRowSelectState<D>,
      UseSortByState<D> {}

  /**
   * Свои свойства колонки — их задаёт витрина, а читает `Datatable`.
   *
   * `align` и `className` правят оформление ячейки, `textOverview` включает
   * обрезку длинного текста, `clickable` разрешает щелчок по ячейке,
   * `cellType` выбирает разбор значения.
   */
  export interface ColumnInterface<D extends object = {}>
    extends UseResizeColumnsColumnOptions<D>,
      UseSortByColumnOptions<D> {
    align?: 'left' | 'center' | 'right';
    className?: string;
    textOverview?: boolean;
    clickable?: boolean;
    money?: boolean;
    skeletonWidthMin?: number;
    skeletonWidthMax?: number;
  }

  export interface ColumnInstance<D extends object = {}>
    extends UseResizeColumnsColumnProps<D>,
      UseSortByColumnProps<D> {
    align?: 'left' | 'center' | 'right';
    className?: string;
    textOverview?: boolean;
    clickable?: boolean;
    money?: boolean;
    skeletonWidthMin?: number;
    skeletonWidthMax?: number;
  }

  export interface Row<D extends object = {}>
    extends UseExpandedRowProps<D>,
      UseRowSelectRowProps<D> {
    depth: number;
  }
}
