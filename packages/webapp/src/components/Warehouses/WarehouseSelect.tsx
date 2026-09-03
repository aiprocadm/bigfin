import React from 'react';
import { FSelect } from '../Forms';

/**
 * Warehouse select field.
 * @param {*} param0
 * @returns
 */
export function WarehouseSelect({ warehouses, ...rest }: any) {
  return (
    <FSelect
      valueAccessor={'id'}
      labelAccessor={'code'}
      textAccessor={'name'}
      popoverProps={{ minimal: true, usePortal: true, inline: false }}
      {...rest}
      items={warehouses}
    />
  );
}
