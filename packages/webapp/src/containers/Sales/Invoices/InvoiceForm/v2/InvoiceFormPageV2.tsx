import { useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import {
  InvoiceFormProviderLoose,
  useInvoiceFormV2Context,
} from './InvoiceFormV2.types';
import { InvoiceFormV2 } from './InvoiceFormV2';

/**
 * Страница формы счёта (v2). Роут прежний: /invoices/new и /invoices/:id/edit.
 * Данные — прежний InvoiceFormProvider (react-query), UI — shadcn.
 */
export default function InvoiceFormPageV2() {
  const { id } = useParams<{ id?: string }>();
  const invoiceId = id ? Number.parseInt(id ?? '', 10) : undefined;

  return (
    <InvoiceFormProviderLoose invoiceId={invoiceId}>
      <InvoiceFormPageV2Content />
    </InvoiceFormProviderLoose>
  );
}

function InvoiceFormPageV2Content() {
  const { isBootLoading } = useInvoiceFormV2Context();

  return (
    <div className="bigfin-ui flex min-h-full flex-1 flex-col bg-background">
      {isBootLoading ? <InvoiceFormSkeletonV2 /> : <InvoiceFormV2 />}
    </div>
  );
}

/** Скелет загрузки формы: карточки шапки, строк и примечаний. */
function InvoiceFormSkeletonV2() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
      <Skeleton className="h-64 w-full rounded-default" />
      <Skeleton className="h-48 w-full rounded-default" />
      <Skeleton className="h-40 w-full rounded-default" />
    </div>
  );
}
