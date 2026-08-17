import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { handleDeleteErrors } from '@/containers/Sales/Invoices/InvoicesLanding/components';
import { useDeleteInvoice } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface InvoiceDeleteAlertProps {
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
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления счёта на продажу (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('invoice-delete', { invoiceId }).
 */
function InvoiceDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: InvoiceDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteInvoiceMutate, isLoading } = useDeleteInvoice(
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

  // Подтверждение: удаляем счёт, показываем тост, закрываем drawer.
  const handleConfirm = () => {
    deleteInvoiceMutate(invoiceId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_invoice_has_been_deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.INVOICE_DETAILS);
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (errors) {
          handleDeleteErrors(errors);
        } else {
          showApiError(error);
        }
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_invoice')}
      description={intl.getHTML(
        'once_delete_this_invoice_you_will_able_to_restore_it',
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
  withDrawerActions,
)(InvoiceDeleteAlertRoot) as ComponentType<InvoiceDeleteAlertProps>;
