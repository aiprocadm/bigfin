import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeliverInvoice } from '@/hooks/query';
import { compose } from '@/utils';

interface InvoiceDeliverAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { invoiceId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение отправки счёта на продажу (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('invoice-deliver', { invoiceId }).
 */
function InvoiceDeliverAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: InvoiceDeliverAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deliverInvoiceMutate, isLoading } = useDeliverInvoice(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const invoiceId = payload?.invoiceId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: отправляем счёт, показываем тост.
  const handleConfirm = () => {
    deliverInvoiceMutate(invoiceId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_invoice_has_been_delivered_successfully'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {})
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('are_sure_to_deliver_this_invoice')}
      confirmLabel={intl.get('deliver')}
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
)(InvoiceDeliverAlertRoot) as ComponentType<InvoiceDeliverAlertProps>;
