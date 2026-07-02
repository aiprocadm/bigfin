import { useCustomer } from '@/hooks/query';

import { CustomerDetailsCardsV2 } from './CustomerDetailsCardsV2';
import { CustomerDetailsHeaderV2 } from './CustomerDetailsHeaderV2';
import { CustomerDetailsSkeletonV2 } from './CustomerDetailsSkeletonV2';
import type { CustomerDetail } from './types';

interface CustomerDetailsContentV2Props {
  customerId?: number | string;
}

// useCustomer — легаси react-query хук без типов, кастуем результат локально.
interface UseCustomerResult {
  data: CustomerDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали клиента»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + прокручиваемые карточки».
 */
export function CustomerDetailsContentV2({
  customerId,
}: CustomerDetailsContentV2Props) {
  const { data: customer, isLoading } = useCustomer(customerId, {
    enabled: !!customerId,
  }) as UseCustomerResult;

  if (isLoading || !customer?.id) {
    return <CustomerDetailsSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CustomerDetailsHeaderV2 customer={customer} customerId={customer.id} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <CustomerDetailsCardsV2 customer={customer} />
      </div>
    </div>
  );
}
