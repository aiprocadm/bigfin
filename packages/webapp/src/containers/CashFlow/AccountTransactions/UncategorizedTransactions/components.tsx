// @ts-nocheck
import intl from 'react-intl-universal';
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import { Icon } from '@/components';
import { safeCallback } from '@/utils';

export function ActionsMenu({
  payload: { onCategorize, onExclude },
  row: { original },
}) {
  return (
    <Menu>
      <MenuItem
        icon={<Icon icon="reader-18" />}
        text={intl.get('categorize')}
        onClick={safeCallback(onCategorize, original)}
      />
      <MenuDivider />
      <MenuItem
        text={intl.get('exclude')}
        onClick={safeCallback(onExclude, original)}
        icon={<Icon icon="disable" iconSize={16} />}
      />
    </Menu>
  );
}
