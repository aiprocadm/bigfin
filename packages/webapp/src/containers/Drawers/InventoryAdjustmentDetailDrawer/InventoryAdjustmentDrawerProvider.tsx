import React from 'react';
import intl from 'react-intl-universal';
import { DrawerHeaderContent, DrawerLoading } from '@/components';
import { useInventoryAdjustment } from '@/hooks/query';
import { DRAWERS } from '@/constants/drawers';

const InventoryAdjustmentDrawerContext = React.createContext<any>(undefined);

/**
 * Inventory adjustment drawer provider.
 */
function InventoryAdjustmentDrawerProvider({ inventoryId, ...props }: any) {
  // Handle fetch inventory adjustment .
  const { data: inventoryAdjustment, isLoading: isAdjustmentsLoading } =
    useInventoryAdjustment(inventoryId, {
      enabled: !!inventoryId,
    });

  //provider.
  const provider = {
    inventoryAdjustment,
    inventoryId,
  };

  return (
    <DrawerLoading loading={isAdjustmentsLoading}>
      <DrawerHeaderContent
        name={DRAWERS.INVENTORY_ADJUSTMENT_DETAILS}
        title={intl.get('inventory_adjustment.details_drawer.title')}
      />
      <InventoryAdjustmentDrawerContext.Provider value={provider} {...props} />
    </DrawerLoading>
  );
}

const useInventoryAdjustmentDrawerContext = () =>
  React.useContext(InventoryAdjustmentDrawerContext);

export {
  InventoryAdjustmentDrawerProvider,
  useInventoryAdjustmentDrawerContext,
};
