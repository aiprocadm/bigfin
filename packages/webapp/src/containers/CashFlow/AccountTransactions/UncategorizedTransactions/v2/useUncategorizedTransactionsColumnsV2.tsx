import React from 'react';
import intl from 'react-intl-universal';
import {
  bankDateColumn,
  bankDescriptionColumn,
  bankPayeeColumn,
  bankReferenceNumberColumn,
  bankDepositColumn,
  bankWithdrawalColumn,
} from '../../v2/bankTableColumns';
import { CategorizeExcludeRowActions } from '../../v2/CategorizeExcludeRowActions';
import { UncategorizedStatusBadge } from './UncategorizedStatusBadge';
import { CategorizeIncludeCheckbox } from './CategorizeIncludeCheckbox';

interface ColumnsHandlers {
  onCategorize: (row: any) => void;
  onExclude: (row: any) => void;
}

/**
 * Колонки таблицы «Некатегоризированные транзакции» под примитив
 * components/ui/data-table.tsx (D-redesign, слайс 4d). База — общий билдер;
 * добавлены: статус (бейдж «Распознано»), правый чек-бокс «включить в категоризацию»
 * и колонка действий «Категоризировать»/«Исключить».
 */
export function useUncategorizedTransactionsColumnsV2({
  onCategorize,
  onExclude,
}: ColumnsHandlers) {
  return React.useMemo(
    () => [
      bankDateColumn(),
      bankDescriptionColumn(),
      bankPayeeColumn(),
      bankReferenceNumberColumn(),
      {
        id: 'status',
        Header: intl.get('status'),
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <UncategorizedStatusBadge transaction={row.original} />
        ),
      },
      bankDepositColumn(),
      bankWithdrawalColumn(),
      {
        id: 'categorize_include',
        Header: '',
        disableSortBy: true,
        align: 'right',
        Cell: ({ row }: any) => (
          <CategorizeIncludeCheckbox transactionId={row.original.id} />
        ),
      },
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        Cell: ({ row }: any) => (
          <CategorizeExcludeRowActions
            onCategorize={() => onCategorize(row.original)}
            onExclude={() => onExclude(row.original)}
          />
        ),
      },
    ],
    [onCategorize, onExclude],
  );
}
