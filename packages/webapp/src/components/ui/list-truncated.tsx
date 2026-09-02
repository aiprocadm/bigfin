// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Info } from 'lucide-react';

/**
 * С2 карты v49. Список говорит, что показал не всё.
 *
 * Сервер отдаёт не больше потолка (карта v49, `listCap`). Молча обрезанный
 * список — худший из вариантов: человек ищет свою заявку глазами, не
 * находит и решает, что она пропала. Поэтому список говорит прямо, сколько
 * строк показано и как сузить выдачу — поиском в шапке, который у этих
 * разделов появился в картах v43 и v48.
 */
export function ListTruncated({ shown }: { shown: number }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm text-text-secondary">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        {intl.get('list_truncated.notice', { shown })}{' '}
        {intl.get('list_truncated.hint')}
      </span>
    </div>
  );
}
