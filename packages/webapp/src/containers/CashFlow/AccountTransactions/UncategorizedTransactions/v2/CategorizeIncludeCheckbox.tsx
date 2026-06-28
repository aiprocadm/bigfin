import React from 'react';
import intl from 'react-intl-universal';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useAddTransactionsToCategorizeSelected,
  useRemoveTransactionsToCategorizeSelected,
  useIsTransactionToCategorizeSelected,
} from '@/hooks/state/banking';

interface CategorizeIncludeCheckboxProps {
  transactionId: number;
}

/**
 * Правый чек-бокс «включить в категоризацию» (D-redesign, слайс 4d).
 * Представление на ui-примитиве, но слой состояния тот же, что у легаси
 * (Redux-набор «транзакции к категоризации» — отдельный от левого мультивыбора).
 * stopPropagation — клик по чек-боксу не должен запускать row-click категоризации.
 */
export function CategorizeIncludeCheckbox({
  transactionId,
}: CategorizeIncludeCheckboxProps) {
  const addToCategorize = useAddTransactionsToCategorizeSelected();
  const removeFromCategorize = useRemoveTransactionsToCategorizeSelected();
  const isSelected = useIsTransactionToCategorizeSelected(transactionId);

  return (
    <Checkbox
      aria-label={intl.get('data_table.aria.select_row')}
      checked={isSelected}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onCheckedChange={() =>
        isSelected
          ? removeFromCategorize(transactionId)
          : addToCategorize(transactionId)
      }
    />
  );
}
