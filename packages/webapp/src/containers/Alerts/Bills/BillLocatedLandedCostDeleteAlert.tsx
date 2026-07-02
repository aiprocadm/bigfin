import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeleteLandedCost } from '@/hooks/query';
import { compose } from '@/utils';

interface BillLocatedLandedCostDeleteAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
// Ключ payload исторически с большой буквы (BillId) — сохраняем 1:1.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { BillId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение удаления распределённых накладных расходов (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('bill-located-cost-delete', { BillId }).
 */
function BillLocatedLandedCostDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: BillLocatedLandedCostDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteLandedCostMutate, isLoading } =
    useDeleteLandedCost({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const billId = payload?.BillId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем накладные расходы, показываем тост.
  const handleConfirm = () => {
    deleteLandedCostMutate(billId)
      .then(() => {
        AppToaster.show({
          message: intl.get('landed_cost.action.delete.success_message'),
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
      title={intl.get('landed_cost.alert.delete.title')}
      description={intl.get(
        'landed_cost.once_your_delete_this_located_landed_cost',
      )}
      confirmLabel={intl.get('delete')}
      intent="danger"
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
)(
  BillLocatedLandedCostDeleteAlertRoot,
) as ComponentType<BillLocatedLandedCostDeleteAlertProps>;
