import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useRejectEstimate } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface EstimateRejectAlertProps {
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
 * Подтверждение отклонения сметы (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('estimate-reject', { estimateId }).
 */
function EstimateRejectAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: EstimateRejectAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: rejectEstimateMutate, isLoading } = useRejectEstimate(
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

  // Подтверждение: отклоняем смету, показываем тост.
  const handleConfirm = () => {
    rejectEstimateMutate(estimateId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_estimate_has_been_rejected_successfully'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('are_sure_to_reject_this_estimate')}
      confirmLabel={intl.get('reject')}
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
)(EstimateRejectAlertRoot) as ComponentType<EstimateRejectAlertProps>;
