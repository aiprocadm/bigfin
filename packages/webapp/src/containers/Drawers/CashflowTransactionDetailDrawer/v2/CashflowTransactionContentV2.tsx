import { useCashflowTransaction } from '@/hooks/query';

import { CashflowTransactionCardsV2 } from './CashflowTransactionCardsV2';
import { CashflowTransactionHeaderV2 } from './CashflowTransactionHeaderV2';
import { CashflowTransactionSkeletonV2 } from './CashflowTransactionSkeletonV2';
import type { CashflowTransactionDetail } from './types';

interface CashflowTransactionContentV2Props {
  referenceId?: number | string;
}

// useCashflowTransaction — легаси react-query хук без типов,
// кастуем результат локально.
interface UseCashflowTransactionResult {
  data: CashflowTransactionDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали денежной операции»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + прокручиваемые карточки».
 */
export function CashflowTransactionContentV2({
  referenceId,
}: CashflowTransactionContentV2Props) {
  const { data: transaction, isLoading } = useCashflowTransaction(referenceId, {
    enabled: !!referenceId,
  }) as UseCashflowTransactionResult;

  if (isLoading || !transaction?.id) {
    return <CashflowTransactionSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CashflowTransactionHeaderV2
        transaction={transaction}
        referenceId={referenceId}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <CashflowTransactionCardsV2 transaction={transaction} />
      </div>
    </div>
  );
}
