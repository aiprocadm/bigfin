import intl from 'react-intl-universal';
import { useCashflowTransaction } from '@/hooks/query';

import { CashflowTransactionCardsV2 } from './CashflowTransactionCardsV2';
import { CashflowTransactionHeaderV2 } from './CashflowTransactionHeaderV2';
import { CashflowTransactionSkeletonV2 } from './CashflowTransactionSkeletonV2';
import { TransactionSplitPanel } from './TransactionSplitPanel';
import { HistoryList } from '@/containers/CashFlow/AllTransactions/RegistryRowActions';
import { RuleApplicationsPanel } from './RuleApplicationsPanel';
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
 * Сумма операции целиком — с ней обязаны сойтись части.
 *
 * Берётся из проводок, а не из показанной строки `formatted_amount`: та
 * отформатирована для чтения («1 234,50 ₽»), и разбирать её обратно в число
 * значило бы зависеть от настроек показа. Одна и та же операция в разных
 * валютах читалась бы по-разному, а сходиться должна всегда.
 */
function splitParentAmount(transaction: CashflowTransactionDetail): number {
  const entries = transaction?.transactions ?? [];

  return entries.reduce(
    (sum, entry) =>
      sum + Math.max(Number(entry.debit ?? 0), Number(entry.credit ?? 0)),
    0,
  );
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

        {/*
          Разделение операции (этап 10 ТЗ). Стоит ЗДЕСЬ, а не отдельным
          экраном: делить платёжку человек решает, глядя на неё саму.
          Родительская операция при этом не трогается — в отчёты идут части,
          в сверку с банком родитель.
        */}
        {/* Какие автоправила разнесли операцию и что поставили (FT-036). */}
        {transaction?.id != null && (
          <RuleApplicationsPanel transactionId={Number(transaction.id)} />
        )}

        {/* История изменений (FT-026 ТЗ-3): кто, когда, что изменил —
            журнал действий и автоправила одной лентой. */}
        {transaction?.id != null && (
          <section className="rounded-default border border-border bg-surface p-4">
            <h3 className="mb-2 text-sm font-medium">{intl.get('all_transactions.actions.history')}</h3>
            <HistoryList row={{ reference_type: 'CashflowTransaction', reference_id: transaction.id }} />
          </section>
        )}

        {transaction?.id != null && (
          <TransactionSplitPanel
            cashflowId={Number(transaction.id)}
            legacyReferenceType={String(transaction.transaction_type ?? '')}
            parentAmount={splitParentAmount(transaction)}
          />
        )}
      </div>
    </div>
  );
}
