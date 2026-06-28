import React from 'react';
import intl from 'react-intl-universal';
import {
  bankDateColumn,
  bankDescriptionColumn,
  bankPayeeColumn,
  bankDepositColumn,
  bankWithdrawalColumn,
} from '../../v2/bankTableColumns';

interface ColumnsHandlers {
  onRestore: (row: any) => void;
}

/**
 * Колонки таблицы «Исключённые транзакции» под примитив components/ui/data-table.tsx
 * (D-redesign, слайс 4b). Базовый набор — из общего билдера (слайс 4b);
 * добавлена колонка действия «Восстановить» (паритет с легаси ActionsMenu,
 * там единственное действие Restore в контекст-меню).
 */
export function useExcludedTransactionsColumnsV2({ onRestore }: ColumnsHandlers) {
  return React.useMemo(
    () => [
      bankDateColumn(),
      bankDescriptionColumn(),
      bankPayeeColumn(),
      bankDepositColumn(),
      bankWithdrawalColumn(),
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        Cell: ({ row }: any) => (
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRestore(row.original);
            }}
            className="rounded-md px-2 py-1 text-sm font-medium text-action hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            {intl.get('restore')}
          </button>
        ),
      },
    ],
    [onRestore],
  );
}
