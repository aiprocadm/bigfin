import { useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import {
  BillFormProviderLoose,
  useBillFormV2Context,
} from './BillFormV2.types';
import { BillFormV2 } from './BillFormV2';

/**
 * Страница формы счёта поставщика (v2). Роут прежний:
 * /bills/new и /bills/:id/edit (переключение — отдельным шагом).
 * Данные — прежний BillFormProvider (react-query), UI — shadcn.
 */
export default function BillFormPageV2() {
  const { id } = useParams<{ id?: string }>();
  const billId = id ? Number.parseInt(id ?? '', 10) : undefined;

  return (
    <BillFormProviderLoose billId={billId}>
      <BillFormPageV2Content />
    </BillFormProviderLoose>
  );
}

function BillFormPageV2Content() {
  const {
    isBillLoading,
    isItemsLoading,
    isVendorsLoading,
    isAccountsLoading,
    isSettingLoading,
  } = useBillFormV2Context();

  // Легаси-провайдер не отдаёт isBootLoading — собираем из его флагов.
  const isBootLoading = Boolean(
    isBillLoading ||
      isItemsLoading ||
      isVendorsLoading ||
      isAccountsLoading ||
      isSettingLoading,
  );

  return (
    <div className="bigfin-ui flex min-h-full flex-1 flex-col bg-background">
      {isBootLoading ? <BillFormSkeletonV2 /> : <BillFormV2 />}
    </div>
  );
}

/** Скелет загрузки формы: карточки шапки, строк и примечания. */
function BillFormSkeletonV2() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
