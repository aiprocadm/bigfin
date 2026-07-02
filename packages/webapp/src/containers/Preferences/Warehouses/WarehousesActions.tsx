import * as React from 'react';
import intl from 'react-intl-universal';
import { Plus } from 'lucide-react';

import { Features } from '@/constants';
import { FeatureCan as FeatureCanBase } from '@/components';
import { Button } from '@/components/ui/button';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';

// Легаси-компонент без типов — кастуем локально.
const FeatureCan = FeatureCanBase as unknown as React.ComponentType<{
  feature: string;
  children?: React.ReactNode;
}>;

/**
 * Панель действий вкладки «Склады»: одна primary-кнопка.
 */
function WarehousesActionsRoot({ openDialog }: WithDialogActionsProps) {
  const handleClickNewWarehouse = () => {
    openDialog('warehouse-form');
  };

  return (
    <div className="bigfin-ui">
      <FeatureCan feature={Features.Warehouses}>
        <Button size="sm" onClick={handleClickNewWarehouse}>
          <Plus className="h-4 w-4" aria-hidden />
          {intl.get('warehouses.label.new_warehouse')}
        </Button>
      </FeatureCan>
    </div>
  );
}

export default withDialogActions(WarehousesActionsRoot);
