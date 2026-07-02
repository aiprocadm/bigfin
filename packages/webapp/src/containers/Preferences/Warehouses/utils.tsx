import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';

interface WarehouseDeleteError {
  type: string;
}

/**
 * Показывает тосты об ошибках удаления склада.
 */
export const handleDeleteErrors = (errors: WarehouseDeleteError[]) => {
  if (
    errors.find((error) => error.type === 'COULD_NOT_DELETE_ONLY_WAERHOUSE')
  ) {
    AppToaster.show({
      message: intl.get('warehouse.error.could_not_delete_only_waerhouse'),
      intent: Intent.DANGER,
    });
  }
  if (errors.some((e) => e.type === 'WAREHOUSE_HAS_ASSOCIATED_TRANSACTIONS')) {
    AppToaster.show({
      message: intl.get(
        'warehouse.error.warehouse_has_associated_transactions',
      ),
      intent: Intent.DANGER,
    });
  }
};
