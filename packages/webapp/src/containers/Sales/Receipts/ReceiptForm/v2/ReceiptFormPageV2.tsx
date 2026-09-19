import { useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import {
  ReceiptFormProviderLoose,
  useReceiptFormV2Context,
} from './ReceiptFormV2.types';
import { ReceiptFormV2 } from './ReceiptFormV2';

/**
 * Страница формы чека (v2). Роут прежний: /receipts/new и /receipts/:id/edit.
 * Данные — прежний ReceiptFormProvider (react-query), UI — shadcn.
 */
export default function ReceiptFormPageV2() {
  const { id } = useParams<{ id?: string }>();
  const receiptId = id ? Number.parseInt(id ?? '', 10) : undefined;

  return (
    <ReceiptFormProviderLoose receiptId={receiptId}>
      <ReceiptFormPageV2Content />
    </ReceiptFormProviderLoose>
  );
}

function ReceiptFormPageV2Content() {
  const { isBootLoading } = useReceiptFormV2Context();

  return (
    <div className="bigfin-ui flex min-h-full flex-1 flex-col bg-background">
      {isBootLoading ? <ReceiptFormSkeletonV2 /> : <ReceiptFormV2 />}
    </div>
  );
}

/** Скелет загрузки формы: карточки шапки, строк и примечаний. */
function ReceiptFormSkeletonV2() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
      <Skeleton className="h-64 w-full rounded-default" />
      <Skeleton className="h-48 w-full rounded-default" />
      <Skeleton className="h-40 w-full rounded-default" />
    </div>
  );
}
