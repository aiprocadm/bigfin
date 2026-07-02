import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteRefundVendorCredit } from '@/hooks/query';
import { compose } from '@/utils';

interface RefundVendorCreditDeleteAlertProps {
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

/**
 * Подтверждение удаления возврата средств по возврату поставщику
 * (shadcn ConfirmDialog). Механизм прежний: redux-алерт по имени.
 */
function RefundVendorCreditDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: RefundVendorCreditDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const { mutateAsync: deleteRefundVendorCreditMutate, isLoading } =
    useDeleteRefundVendorCredit({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const vendorCreditId = payload?.vendorCreditId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    deleteRefundVendorCreditMutate(vendorCreditId)
      .then(() => {
        AppToaster.show({
          message: intl.get(
            'refund_vendor_credit_transactions.alert.delete_message',
          ),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.REFUND_VENDOR_CREDIT_DETAILS);
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [
    deleteRefundVendorCreditMutate,
    vendorCreditId,
    closeDrawer,
    closeAlert,
    name,
  ]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('refund_vendor_credit_transactions.delete_title')}
      description={intl.get(
        'refund_vendor_credit_transactions.once_your_delete_this_refund_vendor_credit',
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
)(RefundVendorCreditDeleteAlertRoot) as ComponentType<RefundVendorCreditDeleteAlertProps>;
