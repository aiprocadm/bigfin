import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useMarkBranchAsPrimary } from '@/hooks/query';
import { compose } from '@/utils';

interface BranchMarkPrimaryAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { branchId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение назначения филиала основным (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('branch-mark-primary', { branchId }).
 */
function BranchMarkPrimaryAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: BranchMarkPrimaryAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: markPrimaryBranchMutate, isLoading } =
    useMarkBranchAsPrimary({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const branchId = payload?.branchId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: делаем филиал основным, показываем тост.
  const handleConfirm = () => {
    markPrimaryBranchMutate(branchId)
      .then(() => {
        AppToaster.show({
          message: intl.get('branch.alert.mark_primary_message'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('make_primary')}
      description={intl.get('branch.alert.are_you_sure_you_want_to_make')}
      confirmLabel={intl.get('make_primary')}
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
)(BranchMarkPrimaryAlertRoot) as ComponentType<BranchMarkPrimaryAlertProps>;
