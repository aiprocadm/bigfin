import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useCloseReceipt } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface ReceiptCloseAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { receiptId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение закрытия чека (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('receipt-close', { receiptId }).
 */
function ReceiptCloseAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: ReceiptCloseAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: closeReceiptMutate, isLoading } = useCloseReceipt(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const receiptId = payload?.receiptId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: закрываем чек, показываем тост.
  const handleConfirm = () => {
    closeReceiptMutate(receiptId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_receipt_has_been_closed_successfully'),
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
      title={intl.get('are_sure_to_close_this_receipt')}
      confirmLabel={intl.get('close')}
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
)(ReceiptCloseAlertRoot) as ComponentType<ReceiptCloseAlertProps>;
