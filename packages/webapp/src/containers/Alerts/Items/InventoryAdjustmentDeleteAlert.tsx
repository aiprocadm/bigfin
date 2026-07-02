import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteInventoryAdjustment } from '@/hooks/query';
import { compose } from '@/utils';

interface InventoryAdjustmentDeleteAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { inventoryId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/**
 * Подтверждение удаления инвентаризации (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('inventory-adjustment-delete', { inventoryId }).
 */
function InventoryAdjustmentDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: InventoryAdjustmentDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const { mutateAsync: deleteInventoryAdjMutate, isLoading } =
    useDeleteInventoryAdjustment({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const inventoryId = payload?.inventoryId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    deleteInventoryAdjMutate(inventoryId)
      .then(() => {
        AppToaster.show({
          message: intl.get(
            'the_adjustment_transaction_has_been_deleted_successfully',
          ),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.INVENTORY_ADJUSTMENT_DETAILS);
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [deleteInventoryAdjMutate, inventoryId, closeDrawer, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_adjustment')}
      description={intl.getHTML(
        'once_delete_this_inventory_a_adjustment_you_will_able_to_restore_it',
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
)(InventoryAdjustmentDeleteAlertRoot) as ComponentType<InventoryAdjustmentDeleteAlertProps>;
