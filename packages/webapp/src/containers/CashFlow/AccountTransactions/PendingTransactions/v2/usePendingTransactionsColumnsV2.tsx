import React from 'react';
import {
  bankDateColumn,
  bankDescriptionColumn,
  bankPayeeColumn,
  bankReferenceNumberColumn,
  bankDepositColumn,
  bankWithdrawalColumn,
} from '../../v2/bankTableColumns';

/**
 * Колонки таблицы «Ожидающие транзакции» под примитив components/ui/data-table.tsx
 * (D-redesign, слайс 4a). Собираются из общего билдера колонок (слайс 4b);
 * Pending добавляет колонку «Номер» между «Контрагентом» и «Поступлением».
 */
export function usePendingTransactionsColumnsV2() {
  return React.useMemo(
    () => [
      bankDateColumn(),
      bankDescriptionColumn(),
      bankPayeeColumn(),
      bankReferenceNumberColumn(),
      bankDepositColumn(),
      bankWithdrawalColumn(),
    ],
    [],
  );
}
