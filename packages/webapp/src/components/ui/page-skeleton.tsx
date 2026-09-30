import * as React from 'react';
import intl from 'react-intl-universal';

import { Skeleton } from './skeleton';

/**
 * Скелет экрана, пока грузится его кусок сборки (UI-055-3 ТЗ-4, R24).
 *
 * Раньше на месте экрана крутился значок загрузки посреди пустоты — и страница
 * «прыгала», когда появлялось содержимое. Скелет повторяет раскладку любого
 * экрана продукта (заголовок, строка управления, блок содержимого) и
 * появляется сразу, без задержки: бюджет R24 — скелет не позже 150 мс.
 */
export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label={intl.get('page_skeleton.loading')}
      className="flex flex-col gap-4 px-4 py-6 md:px-6"
      data-page-skeleton=""
    >
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-64 w-full rounded-default" />
      <Skeleton className="h-40 w-full rounded-default" />
    </div>
  );
}
