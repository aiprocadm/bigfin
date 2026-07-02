import intl from 'react-intl-universal';

import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Скелетон загрузки деталей поставщика: контур шапки + три карточки.
 * DrawerTitle с sr-only текстом сохраняет доступное имя диалога,
 * пока настоящее имя поставщика ещё грузится.
 */
export function VendorDetailsSkeletonV2() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="shrink-0 gap-2 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
        <DrawerTitle className="sr-only">
          {intl.get('vendor.drawer.loading')}
        </DrawerTitle>
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-24" />
      </DrawerHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  );
}
