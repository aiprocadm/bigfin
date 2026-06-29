import { useQueryClient, useMutation } from 'react-query';
import useApiRequest from '../useRequest';
import t from './types';

/** Включает модуль (feature) и обновляет состояние фич в дашборде. */
export function useTurnOnFeature(props?: any) {
  const queryClient = useQueryClient();
  // Легаси-хелпер useApiRequest без типов (его инференс требует 3 аргумента у .post),
  // поэтому типизируем как any — общий паттерн для типизированных query-хуков (см. notifications.tsx).
  const apiRequest: any = useApiRequest();

  return useMutation(
    (feature: string) => apiRequest.post(`features/${feature}/turn-on`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(t.DASHBOARD_META);
      },
      ...props,
    },
  );
}

/** Выключает модуль (feature) и обновляет состояние фич в дашборде. */
export function useTurnOffFeature(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation(
    (feature: string) => apiRequest.post(`features/${feature}/turn-off`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(t.DASHBOARD_META);
      },
      ...props,
    },
  );
}
