import { ComponentType, useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { usePublishInventoryAdjustment } from '@/hooks/query';
import { compose } from '@/utils';

interface InventoryAdjustmentPublishAlertProps {
  name: string;
}

interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { inventoryId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение публикации инвентаризации (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('inventory-adjustment-publish', { inventoryId }).
 */
function InventoryAdjustmentPublishAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: InventoryAdjustmentPublishAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  const { mutateAsync: publishInventoryAdjustmentMutate, isLoading } =
    usePublishInventoryAdjustment({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const inventoryId = payload?.inventoryId;

  const handleCancel = () => {
    closeAlert(name);
  };

  const handleConfirm = useCallback(() => {
    publishInventoryAdjustmentMutate(inventoryId)
      .then(() => {
        AppToaster.show({
          message: intl.get('inventory_adjustment.publish.success_message'),
          intent: Intent.SUCCESS,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  }, [publishInventoryAdjustmentMutate, inventoryId, closeAlert, name]);

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('publish_adjustment')}
      description={intl.get('inventory_adjustment.publish.alert_message')}
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
)(InventoryAdjustmentPublishAlertRoot) as ComponentType<InventoryAdjustmentPublishAlertProps>;
