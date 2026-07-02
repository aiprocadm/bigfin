import { ComponentType } from 'react';
import intl from 'react-intl-universal';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { compose, saveInvoke } from '@/utils';

interface ExpenseDeleteEntriesAlertProps {
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
 * Подтверждение очистки строк расхода (shadcn ConfirmDialog).
 * Механизм прежний: redux-алерт с колбэком onConfirm (без мутации).
 */
function ExpenseDeleteEntriesAlertRoot({
  name,
  onConfirm,
  isOpen,
  closeAlert,
}: ExpenseDeleteEntriesAlertProps &
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
      description={intl.get('expenses.clear_lines_confirm')}
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
)(ExpenseDeleteEntriesAlertRoot) as ComponentType<ExpenseDeleteEntriesAlertProps>;
