import { useEstimate } from '@/hooks/query';

import { EstimateDetailCardsV2 } from './EstimateDetailCardsV2';
import { EstimateDetailHeaderV2 } from './EstimateDetailHeaderV2';
import { EstimateDetailSkeletonV2 } from './EstimateDetailSkeletonV2';
import type { EstimateDetail } from './types';

interface EstimateDetailContentV2Props {
  estimateId?: number | string;
}

// useEstimate — легаси react-query хук без типов, кастуем результат локально.
interface UseEstimateResult {
  data: EstimateDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали сметы»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + прокручиваемые карточки».
 */
export function EstimateDetailContentV2({
  estimateId,
}: EstimateDetailContentV2Props) {
  const { data: estimate, isLoading } = useEstimate(estimateId, {
    enabled: !!estimateId,
  }) as UseEstimateResult;

  if (isLoading || !estimate?.id) {
    return <EstimateDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EstimateDetailHeaderV2 estimate={estimate} estimateId={estimate.id} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <EstimateDetailCardsV2 estimate={estimate} />
      </div>
    </div>
  );
}
