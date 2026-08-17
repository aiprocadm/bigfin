import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useActivateContact } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface ContactActivateAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { contactId?: number | string; service?: string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение активации контакта (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('contact-activate', { contactId }).
 */
function ContactActivateAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: ContactActivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: activateContact, isLoading } = useActivateContact(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const contactId = payload?.contactId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: активируем контакт, показываем тост.
  const handleConfirm = () => {
    activateContact(contactId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_contact_has_been_activated_successfully'),
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
      title={intl.get('activate_contact')}
      description={intl.get('are_sure_to_activate_this_contact')}
      confirmLabel={intl.get('activate')}
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
)(ContactActivateAlertRoot) as ComponentType<ContactActivateAlertProps>;
