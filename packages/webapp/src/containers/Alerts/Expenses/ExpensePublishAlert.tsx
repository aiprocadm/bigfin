import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { usePublishExpense } from '@/hooks/query';
import { compose } from '@/utils';

interface ExpensePublishAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { expenseId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение публикации расхода (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('expense-publish', { expenseId }).
 */
function ExpensePublishAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: ExpensePublishAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const { mutateAsync: publishExpenseMutate, isLoading } = usePublishExpense(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const expenseId = payload?.expenseId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    publishExpenseMutate(expenseId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_expense_has_been_published'),
          intent: Intent.SUCCESS,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [publishExpenseMutate, expenseId, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('publish_expense')}
      description={intl.get('are_sure_to_publish_this_expense')}
      confirmLabel={intl.get('publish')}
      intent="default"
      loading={isLoading}
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
)(ExpensePublishAlertRoot) as ComponentType<ExpensePublishAlertProps>;
