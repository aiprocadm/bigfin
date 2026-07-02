import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useOpenCreditNote } from '@/hooks/query';
import { compose } from '@/utils';

interface CreditNoteOpenedAlertProps {
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
 * Подтверждение открытия возврата покупателю (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('credit-note-open', { creditNoteId }).
 */
function CreditNoteOpenedAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: CreditNoteOpenedAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const { mutateAsync: openCreditNoteMutate, isLoading } = useOpenCreditNote(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const creditNoteId = payload?.creditNoteId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    openCreditNoteMutate(creditNoteId)
      .then(() => {
        AppToaster.show({
          message: intl.get('credit_note_opened.alert.success_message'),
          intent: Intent.SUCCESS,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [openCreditNoteMutate, creditNoteId, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('credit_note.action.make_as_open')}
      description={intl.get('credit_note_opened.are_sure_to_open_this_credit')}
      confirmLabel={intl.get('open')}
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
)(CreditNoteOpenedAlertRoot) as ComponentType<CreditNoteOpenedAlertProps>;
