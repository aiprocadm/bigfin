import { useVendor } from '@/hooks/query';

import { VendorDetailsCardsV2 } from './VendorDetailsCardsV2';
import { VendorDetailsHeaderV2 } from './VendorDetailsHeaderV2';
import { VendorDetailsSkeletonV2 } from './VendorDetailsSkeletonV2';
import type { VendorDetail } from './types';

interface VendorDetailsContentV2Props {
  vendorId?: number | string;
}

// useVendor — легаси react-query хук без типов, кастуем результат локально.
interface UseVendorResult {
  data: VendorDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали поставщика»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + прокручиваемые карточки».
 */
export function VendorDetailsContentV2({ vendorId }: VendorDetailsContentV2Props) {
  const { data: vendor, isLoading } = useVendor(vendorId, {
    enabled: !!vendorId,
  }) as UseVendorResult;

  if (isLoading || !vendor?.id) {
    return <VendorDetailsSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <VendorDetailsHeaderV2 vendor={vendor} vendorId={vendor.id} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <VendorDetailsCardsV2 vendor={vendor} />
      </div>
    </div>
  );
}
