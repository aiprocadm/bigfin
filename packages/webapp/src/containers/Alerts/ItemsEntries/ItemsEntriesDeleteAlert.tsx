import { ComponentType } from 'react';
import intl from 'react-intl-universal';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { compose, saveInvoke } from '@/utils';

interface ItemsEntriesDeleteAlertProps {
  name: string;
  onConfirm?: (event?: unknown) => void;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение очистки строк позиций (shadcn ConfirmDialog).
 * Механизм прежний: redux-алерт с колбэком onConfirm (без мутации).
 */
function ItemsEntriesDeleteAlertRoot({
  name,
  onConfirm,
  isOpen,
  closeAlert,
}: ItemsEntriesDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = () => {
    closeAlert(name);
    saveInvoke(onConfirm);
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('clear_all_lines')}
      description={intl.get('items_entries.clear_lines_confirm')}
      confirmLabel={intl.get('clear_all_lines')}
      intent="danger"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

const withAlertStoreConnectLoose = withAlertStoreConnect as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
)(ItemsEntriesDeleteAlertRoot) as ComponentType<ItemsEntriesDeleteAlertProps>;
