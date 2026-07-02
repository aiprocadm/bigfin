import * as React from 'react';
import intl from 'react-intl-universal';
import { Warehouse } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';

/**
 * Пустое состояние вкладки «Склады»: заголовок, одна строка, одна кнопка.
 */
function WarehousesEmptyStatusRoot({ openDialog }: WithDialogActionsProps) {
  // Открывает диалог активации складов.
  const handleActivateWarehouse = () => {
    openDialog('warehouse-activate', {});
  };

  return (
    <EmptyState
      icon={<Warehouse className="h-8 w-8" aria-hidden />}
      title={intl.get('warehouses.empty_status.title')}
      description={intl.get('warehouses.empty_status.description')}
      action={
        <Button onClick={handleActivateWarehouse}>
          {intl.get('warehouses.activate_button')}
        </Button>
      }
    />
  );
}

export default withDialogActions(WarehousesEmptyStatusRoot);
