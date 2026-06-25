import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';

interface BranchItem {
  id: number;
  name: string;
  code?: string;
}

interface ControlledBranchSelectProps {
  items: BranchItem[];
  value: number | string | null;
  onChange: (branchId: number | null) => void;
  disabled?: boolean;
}

const branchPredicate = (query: string, item: BranchItem) =>
  item.name.toLowerCase().includes(query.toLowerCase());

const branchRenderer = (
  item: BranchItem,
  { handleClick, modifiers }: any,
) => {
  if (!modifiers.matchesPredicate) return null;
  return (
    <MenuItem
      active={modifiers.active}
      key={item.id}
      label={item.code}
      text={item.name}
      onClick={handleClick}
    />
  );
};

export function ControlledBranchSelect({
  items,
  value,
  onChange,
  disabled = false,
}: ControlledBranchSelectProps) {
  const selected = useMemo(
    () => (items || []).find((b) => String(b.id) === String(value)),
    [items, value],
  );

  return (
    <Select
      items={items || []}
      itemRenderer={branchRenderer}
      itemPredicate={branchPredicate}
      filterable
      disabled={disabled}
      onItemSelect={(item: BranchItem) => onChange(item ? item.id : null)}
      popoverProps={{ minimal: true, usePortal: true }}
    >
      <Button
        fill
        disabled={disabled}
        alignText="left"
        text={selected ? selected.name : intl.get('select_branch')}
        rightIcon="caret-down"
        style={{ justifyContent: 'space-between' }}
      />
    </Select>
  );
}
