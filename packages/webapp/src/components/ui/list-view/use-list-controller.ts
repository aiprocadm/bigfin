import * as React from 'react';
import { filterRows } from './filter-rows';

export interface ListControllerState {
  pageIndex: number;
  pageSize: number;
  sortBy: { id: string; desc: boolean }[];
  inactiveMode: boolean;
}

export interface ListControllerOptions {
  /** Преобразование состояния таблицы в серверный query (per-list). */
  transform: (state: ListControllerState) => any;
  /** Поля строки, по которым идёт клиентский поиск. Передавать стабильную ссылку. */
  searchFields: string[];
  initialPageSize?: number;
}

export function useListController({
  transform,
  searchFields,
  initialPageSize = 20,
}: ListControllerOptions) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sortBy, setSortBy] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);

  const query = React.useMemo(
    () => transform({ pageIndex, pageSize, sortBy, inactiveMode: false }),
    [pageIndex, pageSize, sortBy], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Выделение — per-page: при навигации по страницам сбрасываем.
  const onPageChange = React.useCallback((idx: number) => {
    setPageIndex(idx);
    setSelected([]);
  }, []);
  const onPageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
    setPageIndex(0);
    setSelected([]);
  }, []);

  const applySearch = React.useCallback(
    (rows: any[]) => filterRows(rows, search, searchFields),
    [search, searchFields],
  );

  return {
    pageIndex,
    pageSize,
    sortBy,
    search,
    selected,
    query,
    setSortBy,
    setSearch,
    setSelected,
    onPageChange,
    onPageSizeChange,
    applySearch,
  };
}
