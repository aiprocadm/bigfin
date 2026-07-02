import intl from 'react-intl-universal';

import { DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Скелетон загрузки деталей расхода (sr-only заголовок для доступности).
 */
export function ExpenseDrawerSkeletonV2() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerTitle className="sr-only">
        {intl.get('expense.drawer.loading')}
      </DrawerTitle>

      <div className="shrink-0 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <Skeleton className="h-6 w-40" />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
