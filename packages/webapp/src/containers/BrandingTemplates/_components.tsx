import intl from 'react-intl-universal';
import { safeCallback } from '@/utils';
import { Intent, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';

/**
 * Templates table actions menu.
 */
export function ActionsMenu({
  row: { original },
  payload: { onDeleteTemplate, onEditTemplate, onMarkDefaultTemplate },
}: any) {
  return (
    <Menu>
      {!original.default && (
        <>
          <MenuItem
            text={intl.get('branding.templates.mark_default')}
            onClick={safeCallback(onMarkDefaultTemplate, original)}
          />
          <MenuDivider />
        </>
      )}
      <MenuItem
        text={intl.get('branding.templates.edit')}
        onClick={safeCallback(onEditTemplate, original)}
      />
      <MenuDivider />
      <MenuItem
        text={intl.get('branding.templates.delete')}
        intent={Intent.DANGER}
        onClick={safeCallback(onDeleteTemplate, original)}
      />
    </Menu>
  );
}
