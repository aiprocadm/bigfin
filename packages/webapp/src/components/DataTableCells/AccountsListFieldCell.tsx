import React, { useRef, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { FormGroup, Classes, Intent } from '@blueprintjs/core';
import intl from 'react-intl-universal';

import { CellType } from '@/constants';
import { useCellAutoFocus } from '@/hooks';
import { AccountsSuggestField } from '@/components';
import { DataTableCellProps } from './cellProps';

/**
 * Account cell renderer.
 */
export default function AccountCellRenderer({
  column: {
    id,
    accountsDataProp,
    filterAccountsByRootTypes,
    filterAccountsByTypes,
    fieldProps,
    formGroupProps,
  },
  row: { index, original },
  cell: { value: initialValue },
  payload: {
    accounts: defaultAccounts,
    updateData,
    errors,
    autoFocus,
    ...restPayloadProps
  },
}: DataTableCellProps) {
  // Ссылка на поле ввода: сюда кладётся живой элемент страницы, поэтому и
  // объявляем его. Раньше тип выводился как «пусто», и присвоение элемента
  // считалось ошибкой.
  const accountRef = useRef<HTMLInputElement | null>(null);

  useCellAutoFocus(accountRef, autoFocus, id, index);

  const handleAccountSelected = useCallback(
    (account: { id: number }) => {
      updateData(index, id, account.id);
    },
    [updateData, index, id],
  );
  const error = errors?.[index]?.[id];

  const accounts = useMemo(
    () => restPayloadProps[accountsDataProp] || defaultAccounts,
    [restPayloadProps, defaultAccounts, accountsDataProp],
  );

  return (
    <FormGroup
      intent={error ? Intent.DANGER : null}
      className={classNames(
        'form-group--select-list',
        'form-group--account',
        Classes.FILL,
      )}
      {...formGroupProps}
    >
      <AccountsSuggestField
        items={accounts}
        onItemSelect={handleAccountSelected}
        selectedValue={initialValue}
        filterByRootTypes={filterAccountsByRootTypes}
        filterByTypes={filterAccountsByTypes}
        inputProps={{
          inputRef: (ref) => (accountRef.current = ref),
          placeholder: intl.get('search'),
        }}
        openOnKeyDown={true}
        blurOnSelectClose={false}
        {...fieldProps}
      />
    </FormGroup>
  );
}
AccountCellRenderer.cellType = CellType.Field;
