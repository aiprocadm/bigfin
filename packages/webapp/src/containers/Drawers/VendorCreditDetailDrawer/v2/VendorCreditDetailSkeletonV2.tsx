import intl from 'react-intl-universal';

import { DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Скелетон загрузки деталей возврата поставщику (sr-only заголовок).
 */
export function VendorCreditDetailSkeletonV2() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerTitle className="sr-only">
        {intl.get('vendor_credit.drawer.loading')}
      </DrawerTitle>

      <div className="shrink-0 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <Skeleton className="h-6 w-52" />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
