import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useInactivateContact } from '@/hooks/query';
import { compose } from '@/utils';

interface VendorInactivateAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { vendorId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение деактивации поставщика (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('vendor-inactivate', { vendorId }).
 */
function VendorInactivateAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: VendorInactivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: inactivateContact, isLoading } = useInactivateContact(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const vendorId = payload?.vendorId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: деактивируем поставщика, показываем тост.
  const handleConfirm = () => {
    inactivateContact(vendorId)
      .then(() => {
        AppToaster.show({
          message: intl.get('vendor.alert.inactivated_message'),
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
      title={intl.get('inactivate_vendor')}
      description={intl.get(
        'vendor.alert.are_you_sure_want_to_inactivate_this_vendor',
      )}
      confirmLabel={intl.get('inactivate')}
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
)(VendorInactivateAlertRoot) as ComponentType<VendorInactivateAlertProps>;
