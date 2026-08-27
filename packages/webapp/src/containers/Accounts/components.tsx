// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import {
  Position,
  Classes,
  Tooltip,
  MenuItem,
  Menu,
  MenuDivider,
  Intent,
} from '@blueprintjs/core';
import { Can, Icon, If } from '@/components';
import { safeCallback } from '@/utils';
import { AbilitySubject, AccountAction } from '@/constants/abilityOption';
import { accountBalanceText } from '@/utils/accountBalance';

/**
 * Accounts table actions menu.
 */
export function ActionsMenu({
  row: { original },
  payload: {
    onEdit,
    onViewDetails,
    onDelete,
    onNewChild,
    onActivate,
    onInactivate,
    // onDrawer,
  },
}) {
  return (
    <Menu>
      <MenuItem
        icon={<Icon icon="reader-18" />}
        text={intl.get('view_details')}
        onClick={safeCallback(onViewDetails, original)}
      />
      <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
        <MenuDivider />
        <MenuItem
          icon={<Icon icon="pen-18" />}
          text={intl.get('edit_account')}
          onClick={safeCallback(onEdit, original)}
        />

        <MenuItem
          icon={<Icon icon="plus" />}
          text={intl.get('new_child_account')}
          onClick={safeCallback(onNewChild, original)}
        />
        <MenuDivider />
      </Can>
      <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
        <If condition={original.active}>
          <MenuItem
            text={intl.get('inactivate_account')}
            icon={<Icon icon="pause-16" iconSize={16} />}
            onClick={safeCallback(onInactivate, original)}
          />
        </If>
        <If condition={!original.active}>
          <MenuItem
            text={intl.get('activate_account')}
            icon={<Icon icon="play-16" iconSize={16} />}
            onClick={safeCallback(onActivate, original)}
          />
        </If>
      </Can>
      <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
        <MenuItem
          text={intl.get('delete_account')}
          icon={<Icon icon="trash-16" iconSize={16} />}
          intent={Intent.DANGER}
          onClick={safeCallback(onDelete, original)}
        />
      </Can>
    </Menu>
  );
}

/**
 * Normal cell.
 */
export function NormalCell({ cell: { value } }) {
  const arrowDirection = value === 'credit' ? 'down' : 'up';

  // Can't continue if the value is not `credit` or `debit`.
  if (['credit', 'debit'].indexOf(value) === -1) {
    return '';
  }
  return (
    <Tooltip
      className={Classes.TOOLTIP_INDICATOR}
      content={intl.get(value)}
      position={Position.RIGHT}
      hoverOpenDelay={100}
    >
      <Icon icon={`arrow-${arrowDirection}`} />
    </Tooltip>
  );
}

/**
 * Balance cell.
 */
export function BalanceCell({ cell }) {
  const account = cell.row.original;

  // Счёт без движений — это ноль, а не «неизвестно» (С2 карты v29).
  return (
    <span>
      {accountBalanceText(
        account.amount,
        account.formatted_amount,
        account.currency_code,
      )}
    </span>
  );
}

/**
 * Balance cell.
 */
export function BankBalanceCell({ cell }) {
  const account = cell.row.original;

  // Счёт без движений — это ноль, а не «неизвестно» (С2 карты v29).
  return (
    <span>
      {accountBalanceText(
        account.amount,
        account.bank_balance_formatted,
        account.currency_code,
      )}
    </span>
  );
}
