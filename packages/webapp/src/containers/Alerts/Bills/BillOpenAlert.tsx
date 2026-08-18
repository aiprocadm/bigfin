import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useOpenBill } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface BillOpenAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { billId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение открытия счёта поставщика (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('bill-open', { billId }).
 */
function BillOpenAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: BillOpenAlertProps & WithAlertStoreConnectProps & WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: openBillMutate, isLoading } = useOpenBill(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const billId = payload?.billId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: открываем счёт поставщика, показываем тост.
  const handleConfirm = () => {
    openBillMutate(billId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_bill_has_been_opened_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch((error) => {
        showApiError(error);
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('open_bill')}
      description={intl.get('are_sure_to_open_this_bill')}
      confirmLabel={intl.get('open')}
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
)(BillOpenAlertRoot) as ComponentType<BillOpenAlertProps>;
