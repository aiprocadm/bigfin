import React from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';

/**
 * Бейджи состояния операции (FIN-003 ТЗ-2).
 *
 * ПОДПИСИ СЛОВАМИ, А НЕ БУКВАМИ. У конкурента это «Д» и «К» — их надо
 * заучить. «нам должны» и «мы должны» понятны сразу, а продукт сделан для
 * предпринимателя без бухгалтерского образования.
 *
 * ЦВЕТ ТОЛЬКО У БЕДЫ. Красный — у просрочки: это и есть беда. Долг с
 * будущим сроком и план — обычная жизнь бизнеса, и красить их значит
 * приучить не замечать красный вовсе.
 */
export type TransactionStateKind =
  | 'receivable'
  | 'payable'
  | 'overdue'
  | 'planned';

export interface TransactionStateItem {
  kind: TransactionStateKind;
  dueDate?: string | null;
}

/** Сколько бейджей помещается в строку, не выталкивая сумму за край. */
export const MAX_VISIBLE_BADGES = 2;

/**
 * Что показать: первые два состояния и, если есть ещё, счётчик.
 *
 * Прятать молча нельзя — человек решит, что состояний ровно два.
 */
export function visibleStates(states: TransactionStateItem[] = []) {
  const visible = states.slice(0, MAX_VISIBLE_BADGES);

  return { visible, hidden: Math.max(0, states.length - visible.length) };
}

export function TransactionStateBadges({
  states = [],
}: {
  states?: TransactionStateItem[];
}) {
  if (states.length === 0) return null;

  const { visible, hidden } = visibleStates(states);

  return (
    <span className="mr-2 inline-flex items-center gap-1">
      {visible.map((state) => (
        <Badge
          key={state.kind}
          variant={state.kind === 'overdue' ? 'destructive' : 'outline'}
          title={
            state.dueDate
              ? intl.get(`transaction_state.${state.kind}.hint_due`, {
                  date: state.dueDate,
                })
              : intl.get(`transaction_state.${state.kind}.hint`)
          }
        >
          {intl.get(`transaction_state.${state.kind}`)}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge variant="outline" title={intl.get('transaction_state.more_hint')}>
          {`+${hidden}`}
        </Badge>
      )}
    </span>
  );
}
