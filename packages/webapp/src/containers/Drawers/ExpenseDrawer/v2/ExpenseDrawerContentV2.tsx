import { useExpense } from '@/hooks/query';

import { ExpenseDrawerCardsV2 } from './ExpenseDrawerCardsV2';
import { ExpenseDrawerHeaderV2 } from './ExpenseDrawerHeaderV2';
import { ExpenseDrawerSkeletonV2 } from './ExpenseDrawerSkeletonV2';
import type { ExpenseDetail } from './types';

interface ExpenseDrawerContentV2Props {
  expenseId?: number | string;
}

// useExpense — легаси react-query хук без типов, кастуем результат локально.
interface UseExpenseResult {
  data: ExpenseDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали расхода»: загрузка, скелетон, компоновка
 * «шапка (закреплена) + прокручиваемые карточки».
 */
export function ExpenseDrawerContentV2({
  expenseId,
}: ExpenseDrawerContentV2Props) {
  const { data: expense, isLoading } = useExpense(expenseId, {
    enabled: !!expenseId,
  }) as UseExpenseResult;

  if (isLoading || !expense?.id) {
    return <ExpenseDrawerSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ExpenseDrawerHeaderV2 expense={expense} expenseId={expense.id} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <ExpenseDrawerCardsV2 expense={expense} />
      </div>
    </div>
  );
}
