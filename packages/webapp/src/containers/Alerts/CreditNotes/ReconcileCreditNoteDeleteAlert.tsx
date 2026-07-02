import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeleteReconcileCredit } from '@/hooks/query';
import { compose } from '@/utils';

interface ReconcileCreditNoteDeleteAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { creditNoteId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение удаления сверки возврата покупателю (shadcn ConfirmDialog).
 * Механизм прежний: redux-алерт по имени.
 */
function ReconcileCreditNoteDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: ReconcileCreditNoteDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const { mutateAsync: deleteReconcileCreditMutate, isLoading } =
    useDeleteReconcileCredit({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const creditNoteId = payload?.creditNoteId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    deleteReconcileCreditMutate(creditNoteId)
      .then(() => {
        AppToaster.show({
          message: intl.get('reconcile_credit_note.alert.success_message'),
          intent: Intent.SUCCESS,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [deleteReconcileCreditMutate, creditNoteId, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('reconcile_credit_note.delete_title')}
      description={intl.getHTML(
        'reconcile_credit_note.once_you_delete_this_reconcile_credit_note',
      )}
      confirmLabel={intl.get('delete')}
      intent="danger"
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
)(ReconcileCreditNoteDeleteAlertRoot) as ComponentType<ReconcileCreditNoteDeleteAlertProps>;
