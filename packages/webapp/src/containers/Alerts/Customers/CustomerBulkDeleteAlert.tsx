import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { transformErrors } from '@/containers/Customers/utils';
import { useBulkDeleteCustomers } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface CustomerBulkDeleteAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { customersIds?: (number | string)[] };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение массового удаления клиентов (shadcn ConfirmDialog).
 * В легаси вызывалась несуществующая requestDeleteBulkCustomers (падало на
 * confirm) — подключён актуальный хук useBulkDeleteCustomers.
 */
function CustomerBulkDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: CustomerBulkDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: bulkDeleteCustomers, isLoading } =
    useBulkDeleteCustomers({}) as unknown as {
      mutateAsync: (ids?: (number | string)[]) => Promise<unknown>;
      isLoading: boolean;
    };
  const customersIds = payload?.customersIds;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем выбранных клиентов, показываем тост.
  const handleConfirm = () => {
    bulkDeleteCustomers(customersIds)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_customers_has_been_deleted_successfully'),
          intent: Intent.SUCCESS,
        });
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (errors) {
          transformErrors(errors);
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
      title={intl.get('delete_customers')}
      description={intl.get(
        'once_delete_these_customers_you_will_not_able_restore_them',
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
)(CustomerBulkDeleteAlertRoot) as ComponentType<CustomerBulkDeleteAlertProps>;
