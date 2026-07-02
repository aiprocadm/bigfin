import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useOpenVendorCredit } from '@/hooks/query';
import { compose } from '@/utils';

interface VendorCreditOpenedAlertProps {
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
 * Подтверждение открытия возврата поставщику (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('vendor-credit-open', { vendorCreditId }).
 */
function VendorCreditOpenedAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: VendorCreditOpenedAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const { mutateAsync: openVendorCreditMutate, isLoading } =
    useOpenVendorCredit({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const vendorCreditId = payload?.vendorCreditId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    openVendorCreditMutate(vendorCreditId)
      .then(() => {
        AppToaster.show({
          message: intl.get('vendor_credit_opened.alert.success_message'),
          intent: Intent.SUCCESS,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [openVendorCreditMutate, vendorCreditId, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('vendor_credits.action.mark_as_open')}
      description={intl.get('vendor_credit_opened.are_sure_to_open_this_credit')}
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
)(VendorCreditOpenedAlertRoot) as ComponentType<VendorCreditOpenedAlertProps>;
