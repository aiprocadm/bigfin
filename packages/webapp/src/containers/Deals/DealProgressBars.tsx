import React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';

/** Пометка о расхождении или превышении ста процентов. */
export type DealProgressFlag =
  | 'work_ahead'
  | 'money_ahead'
  | 'overpaid'
  | 'overdelivered';

export interface DealProgressBarsProps {
  /** Оплачено, %. `null` — суммы сделки нет, делить не на что. */
  paidRatio?: number | null;
  /** Отгружено, %. `null` — делить не на что. */
  shippedRatio?: number | null;
  flags?: DealProgressFlag[];
  className?: string;
}

/**
 * «Оплачено, %» и «Отгружено, %» в строке сделки (FIN-024 ТЗ-2).
 *
 * ЗАЧЕМ. Сделка показывает сумму и прибыль, но не показывает, насколько она
 * закрыта. «Деньги пришли, работа не сделана» и «работа сделана, денег нет» —
 * два разных положения, и оба не видны из суммы.
 *
 * ПОМЕТКА НЕЙТРАЛЬНАЯ, А НЕ КРАСНАЯ. Расхождение — это повод посмотреть, а не
 * пожар. Красный в продукте занят кассовым разрывом и просрочкой.
 */
export function DealProgressBars({
  paidRatio,
  shippedRatio,
  flags = [],
  className,
}: DealProgressBarsProps) {
  return (
    <span className={cn('flex flex-col gap-1', className)}>
      <ProgressLine
        label={intl.get('deals.progress.paid')}
        ratio={paidRatio ?? null}
      />
      <ProgressLine
        label={intl.get('deals.progress.shipped')}
        ratio={shippedRatio ?? null}
      />
      {flags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {flags.map((flag) => (
            <span
              key={flag}
              className="rounded-default bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary"
            >
              {intl.get(`deals.progress.${flag}`)}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function ProgressLine({
  label,
  ratio,
}: {
  label: string;
  ratio: number | null;
}) {
  return (
    <span className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="w-20 shrink-0">{label}</span>
      <span className="h-1.5 w-24 shrink-0 rounded-full bg-surface-elevated">
        <span
          className="block h-1.5 rounded-full bg-action"
          // Полоса не длиннее своей дорожки: доля выше ста процентов
          // растянула бы строку таблицы. О превышении говорит пометка.
          style={{ width: `${Math.min(Math.max(ratio ?? 0, 0), 100)}%` }}
        />
      </span>
      <span className="tabular-nums">
        {/* «Н/о» вместо нуля: ноль означал бы «ничего не оплачено», хотя
            оплачивать нечего. */}
        {ratio === null ? intl.get('deals.progress.unknown') : `${ratio}%`}
      </span>
    </span>
  );
}
