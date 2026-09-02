import React from 'react';
import { MenuItem, Button } from '@blueprintjs/core';
import { FSelect } from '@/components';

/**
 *
 * @param {*}
 * @param {*} param1
 * @returns
 */
const chargeTypeItemRenderer = (item: any, { handleClick, modifiers, query }: any) => {
  return (
    <MenuItem
      label={item.label}
      key={item.name}
      onClick={handleClick}
      text={item.name}
    />
  );
};

const chargeTypeSelectProps = {
  itemRenderer: chargeTypeItemRenderer,
  valueAccessor: 'value',
  labelAccessor: 'name',
};

/**
 *
 * @param param0
 * @returns
 */
export function ProjectTaskChargeTypeSelect({ items, ...rest }: any) {
  return (
    <FSelect
      {...chargeTypeSelectProps}
      {...rest}
      items={items}
      input={ChargeTypeSelectButton}
    />
  );
}
/**
 *
 * @param param0
 * @returns
 */
function ChargeTypeSelectButton({ label }: any) {
  return <Button text={label} />;
}
