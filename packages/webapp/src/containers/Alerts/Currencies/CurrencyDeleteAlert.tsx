import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeleteCurrency } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface CurrencyDeleteAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { currency_code?: string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления валюты (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('currency-delete', { currency_code }).
 */
function CurrencyDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: CurrencyDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteCurrency, isLoading } = useDeleteCurrency(
    {},
  ) as unknown as {
    mutateAsync: (code?: string) => Promise<unknown>;
    isLoading: boolean;
  };
  const currencyCode = payload?.currency_code;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем валюту, показываем тост, закрываем алерт.
  const handleConfirm = () => {
    deleteCurrency(currencyCode)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_currency_has_been_deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch((error: ApiErrorResponse) => {
        showApiError(error);
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_currency')}
      description={intl.getHTML(
        'once_delete_this_currency_you_will_able_to_restore_it',
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
)(CurrencyDeleteAlertRoot) as ComponentType<CurrencyDeleteAlertProps>;
