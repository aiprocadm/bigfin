// @ts-nocheck
import intl from 'react-intl-universal';
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import { safeCallback } from '@/utils';
import { Icon } from '@/components';

export function ActionsMenu({
  payload: { onCategorize, onExclude },
  row: { original },
}) {
  return (
    <Menu>
      <MenuItem
        text={intl.get('categorize')}
        icon={<Icon icon="reader-18" />}
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
