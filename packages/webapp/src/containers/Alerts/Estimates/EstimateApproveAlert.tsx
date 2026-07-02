import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { useQueryClient } from 'react-query';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useApproveEstimate } from '@/hooks/query';
import { compose } from '@/utils';

interface EstimateApproveAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { estimateId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение одобрения сметы (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('estimate-Approve', { estimateId }).
 */
function EstimateApproveAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: EstimateApproveAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const queryClient = useQueryClient();
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: approveEstimateMutate, isLoading } = useApproveEstimate(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const estimateId = payload?.estimateId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: одобряем смету, показываем тост, обновляем таблицу.
  const handleConfirm = useCallback(() => {
    approveEstimateMutate(estimateId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_estimate_has_been_approved_successfully'),
          intent: Intent.SUCCESS,
        });
        queryClient.invalidateQueries('estimates-table');
      })
      .catch(() => {})
      .finally(() => {
        closeAlert(name);
      });
  }, [approveEstimateMutate, estimateId, queryClient, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('are_sure_to_approve_this_estimate')}
      confirmLabel={intl.get('approve')}
      loading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

// withAlertStoreConnect — легаси-HOC (без типов): mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withAlertStoreConnectLoose = withAlertStoreConnect as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
)(EstimateApproveAlertRoot) as ComponentType<EstimateApproveAlertProps>;
