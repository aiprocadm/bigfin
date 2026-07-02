import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeleteReconcileVendorCredit } from '@/hooks/query';
import { compose } from '@/utils';

interface ReconcileVendorCreditDeleteAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { vendorCreditId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение удаления сверки возврата поставщику (shadcn ConfirmDialog).
 * Механизм прежний: redux-алерт по имени.
 */
function ReconcileVendorCreditDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: ReconcileVendorCreditDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const { mutateAsync: deleteReconcileVendorCreditMutate, isLoading } =
    useDeleteReconcileVendorCredit({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const vendorCreditId = payload?.vendorCreditId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    deleteReconcileVendorCreditMutate(vendorCreditId)
      .then(() => {
        AppToaster.show({
          message: intl.get('reconcile_vendor_credit.alert.success_message'),
          intent: Intent.SUCCESS,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [deleteReconcileVendorCreditMutate, vendorCreditId, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('reconcile_vendor_credit.delete_title')}
      description={intl.getHTML(
        'reconcile_vendor_credit.alert.once_you_delete_this_reconcile_vendor_credit',
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
)(ReconcileVendorCreditDeleteAlertRoot) as ComponentType<ReconcileVendorCreditDeleteAlertProps>;
