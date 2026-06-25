import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { accountPredicate } from '@/components/Accounts/_components';
import { usePreprocessingAccounts } from '@/components/Accounts/_hooks';

interface AccountItem {
  id: number;
  name: string;
  code?: string;
  account_level?: number;
}

interface ControlledAccountsSelectProps {
  items: AccountItem[];
  value: number | string | null;
  onChange: (accountId: number | null) => void;
  filterByRootTypes?: string[];
  disabled?: boolean;
  placeholder?: string;
}

// Blueprint's ItemRenderer generic is locked by accountPredicate to AccountSelect,
// so we accept `any` here to stay compatible without importing AccountSelect.
const accountRenderer = (item: any, { handleClick, modifiers }: any) => {
  if (!modifiers.matchesPredicate) return null;
  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      label={item.code}
      key={item.id}
      text={item.name}
      onClick={handleClick}
    />
  );
};

export function ControlledAccountsSelect({
  items,
  value,
  onChange,
  filterByRootTypes,
  disabled = false,
  placeholder,
}: ControlledAccountsSelectProps) {
  const filtered = usePreprocessingAccounts(items, {
    filterByRootTypes: filterByRootTypes || [],
    filterByParentTypes: [],
    filterByTypes: [],
    filterByNormal: [],
  });

  const selected = useMemo(
    () => filtered.find((a: AccountItem) => String(a.id) === String(value)),
    [filtered, value],
  );

  return (
    <Select
      items={filtered}
      itemRenderer={accountRenderer}
      itemPredicate={accountPredicate}
      filterable
      disabled={disabled}
      onItemSelect={(item: any) => onChange(item ? item.id : null)}
      popoverProps={{ minimal: true, usePortal: true }}
      inputProps={{ placeholder: intl.get('filter_') }}
    >
      <Button
        fill
        disabled={disabled}
        alignText="left"
        text={
          selected
            ? selected.name
            : placeholder || intl.get('select_account')
        }
        rightIcon="caret-down"
        style={{ justifyContent: 'space-between' }}
      />
    </Select>
  );
}
