import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { Can, Icon } from '@/components';
import { AbilitySubject, BankRuleAction } from '@/constants/abilityOption';
import { safeCallback } from '@/utils';

/**
 * Tax rates table actions menu.
 * @returns {JSX.Element}
 */
export function BankRulesTableActionsMenu({
  payload: { onEdit, onDelete, onApplyToPast },
  row: { original },
}: any) {
  return (
    <Menu>
      <Can I={BankRuleAction.Edit} a={AbilitySubject.BankRule}>
        <MenuItem
          icon={<Icon icon="pen-18" />}
          text={intl.get('banking.rules.edit')}
          onClick={safeCallback(onEdit, original)}
        />
        {/* «Применить к прошлым операциям» (FT-034 ТЗ-3). */}
        <MenuItem
          icon={<Icon icon="done" />}
          text={intl.get('banking.rules.apply_past.menu')}
          onClick={safeCallback(onApplyToPast, original)}
        />
      </Can>
      <Can I={BankRuleAction.Delete} a={AbilitySubject.BankRule}>
        <MenuDivider />
        <MenuItem
          text={intl.get('banking.rules.delete')}
          intent={Intent.DANGER}
          onClick={safeCallback(onDelete, original)}
          icon={<Icon icon="trash-16" iconSize={16} />}
        />
      </Can>
    </Menu>
  );
}
