import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { handleDeleteErrors } from '@/containers/Purchases/CreditNotes/CreditNotesLanding/utils';
import { useDeleteVendorCredit } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface VendorCreditDeleteAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { vendorCreditId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления возврата поставщику (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('vendor-credit-delete', { vendorCreditId }).
 */
function VendorCreditDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: VendorCreditDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const { mutateAsync: deleteVendorCreditMutate, isLoading } =
    useDeleteVendorCredit({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const vendorCreditId = payload?.vendorCreditId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    deleteVendorCreditMutate(vendorCreditId)
      .then(() => {
        AppToaster.show({
          message: intl.get('vendor_credits.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.VENDOR_CREDIT_DETAILS);
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (errors) {
          handleDeleteErrors(errors);
        } else {
          showApiError(error);
        }
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [deleteVendorCreditMutate, vendorCreditId, closeDrawer, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('vendor_credits.action.delete_vendor_credit')}
      description={intl.getHTML(
        'vendor_credits.note.once_delete_this_vendor_credit_note',
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
)(VendorCreditDeleteAlertRoot) as ComponentType<VendorCreditDeleteAlertProps>;
