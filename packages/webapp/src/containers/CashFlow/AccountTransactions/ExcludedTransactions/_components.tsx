// @ts-nocheck
import intl from 'react-intl-universal';
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import { safeCallback } from '@/utils';
import { Icon } from '@/components';

export function ActionsMenu({ payload: { onRestore }, row: { original } }) {
  return (
    <Menu>
      <MenuItem
        text={intl.get('banking.action.unexclude')}
        icon={<Icon icon="redo" iconSize={16} />}
        onClick={safeCallback(onRestore, original)}
      />
    </Menu>
  );
}
