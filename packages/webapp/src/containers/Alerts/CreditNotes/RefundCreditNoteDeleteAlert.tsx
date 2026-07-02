import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteRefundCreditNote } from '@/hooks/query';
import { compose } from '@/utils';

interface RefundCreditNoteDeleteAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { creditNoteId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/**
 * Подтверждение удаления возврата средств по возврату покупателю
 * (shadcn ConfirmDialog). Механизм прежний: redux-алерт по имени.
 */
function RefundCreditNoteDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: RefundCreditNoteDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const { mutateAsync: deleteRefundCreditMutate, isLoading } =
    useDeleteRefundCreditNote({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const creditNoteId = payload?.creditNoteId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    deleteRefundCreditMutate(creditNoteId)
      .then(() => {
        AppToaster.show({
          message: intl.get('refund_credit_transactions.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.REFUND_CREDIT_NOTE_DETAILS);
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [deleteRefundCreditMutate, creditNoteId, closeDrawer, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('refund_credit_transactions.delete_title')}
      description={intl.get(
        'refund_credit_transactions.once_your_delete_this_refund_credit_note',
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
  withDrawerActions,
)(RefundCreditNoteDeleteAlertRoot) as ComponentType<RefundCreditNoteDeleteAlertProps>;
