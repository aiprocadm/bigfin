import { useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import {
  EstimateFormProviderLoose,
  useEstimateFormV2Context,
} from './EstimateFormV2.types';
import { EstimateFormV2 } from './EstimateFormV2';

/**
 * Страница формы сметы (v2). Роут прежний: /estimates/new и /estimates/:id/edit.
 * Данные — прежний EstimateFormProvider (react-query), UI — shadcn.
 */
export default function EstimateFormPageV2() {
  const { id } = useParams<{ id?: string }>();
  const estimateId = id ? Number.parseInt(id ?? '', 10) : undefined;

  return (
    <EstimateFormProviderLoose estimateId={estimateId}>
      <EstimateFormPageV2Content />
    </EstimateFormProviderLoose>
  );
}

function EstimateFormPageV2Content() {
  const { isBootLoading } = useEstimateFormV2Context();

  return (
    <div className="bigfin-ui flex min-h-full flex-1 flex-col bg-background">
      {isBootLoading ? <EstimateFormSkeletonV2 /> : <EstimateFormV2 />}
    </div>
  );
}

/** Скелет загрузки формы: карточки шапки, строк и примечаний. */
function EstimateFormSkeletonV2() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
      <Skeleton className="h-64 w-full rounded-default" />
      <Skeleton className="h-48 w-full rounded-default" />
      <Skeleton className="h-40 w-full rounded-default" />
    </div>
  );
}
