// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { useDashboardMeta } from '@/hooks/query';

/**
 * Плашка «показаны только доступные вам данные» (FT-080 ТЗ-3).
 *
 * Сервер исключает чужие направления, счета и статьи из каждого отчёта и
 * считает итог по оставшемуся. Человек должен знать, что перед ним часть,
 * а не вся организация, — иначе он сравнит свою сумму с выпиской банка и
 * решит, что отчёт врёт.
 *
 * Одна плашка над страницей, а не в каждом отчёте: ограничение действует
 * везде, и новый экран не должен «забыть» о нём сказать.
 */
export function RowScopeNotice() {
  // Ответ загрузки уже в кеше — повторно не спрашиваем.
  const { data } = useDashboardMeta({ enabled: false }) as {
    data?: { row_scope?: { restricted?: boolean } };
  };
  if (!isRowScopeRestricted(data)) return null;

  return (
    <div
      role="note"
      className="border-b border-border bg-surface-elevated px-4 py-2 text-xs text-text-secondary"
    >
      {intl.get('row_scope.notice')}
    </div>
  );
}

export function isRowScopeRestricted(meta: any): boolean {
  return !!(meta?.row_scope?.restricted ?? meta?.rowScope?.restricted);
}
