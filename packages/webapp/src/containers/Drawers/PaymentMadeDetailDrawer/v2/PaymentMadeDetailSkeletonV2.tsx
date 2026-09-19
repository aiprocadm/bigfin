import intl from 'react-intl-universal';

import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Скелетон загрузки деталей исходящего платежа: контур шапки + карточки.
 * DrawerTitle с sr-only текстом сохраняет доступное имя диалога,
 * пока данные платежа ещё грузятся.
 */
export function PaymentMadeDetailSkeletonV2() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="shrink-0 gap-2 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
        <DrawerTitle className="sr-only">
          {intl.get('payment_made.drawer.loading')}
        </DrawerTitle>
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="h-4 w-32" />
      </DrawerHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-56 max-w-full rounded-control" />
        <Skeleton className="h-48 rounded-default" />
        <Skeleton className="h-56 rounded-default" />
      </div>
    </div>
  );
}
