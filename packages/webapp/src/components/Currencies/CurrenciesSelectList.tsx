import React, { useCallback } from 'react';
import { MenuItem, Button } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';

export function CurrenciesSelectList({ selectProps, onItemSelect, className }: any) {
  const currencies = [
    {
      id: 'USD',
      code: 'USD',
      name: 'USD US dollars',
    },
    {
      id: 'CAD',
      code: 'CAD',
      name: 'CAD Canadian dollars',
    },
  ];

  // Handle currency item select.
  const onCurrencySelect = useCallback(
    (currency: any) => {
      onItemSelect && onItemSelect(currency);
    },
    [onItemSelect],
  );

  // Filters currencies list.
  const filterCurrenciesPredicator = useCallback(
    (query: any, currency: any, _index: any, exactMatch: any) => {
      const normalizedTitle = currency.name.toLowerCase();
      const normalizedQuery = query.toLowerCase();
      return `${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
    },
    [],
  );

  // Currency item of select currencies field.
  const currencyItem = (item: any, { handleClick, modifiers, query }: any) => {
    return (
      <MenuItem
        text={item.name}
        label={item.code}
        key={item.id}
        onClick={handleClick}
      />
    );
  };

  return (
    <Select
      items={currencies}
      noResults={<MenuItem disabled={true} text="No results." />}
      itemRenderer={currencyItem}
      itemPredicate={filterCurrenciesPredicator}
      popoverProps={{ minimal: true }}
      onItemSelect={onCurrencySelect}
      {...selectProps}
    >
      <Button text={'USD US dollars'} />
    </Select>
  );
}
