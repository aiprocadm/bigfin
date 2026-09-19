import React from 'react';
import classNames from 'classnames';
import { get } from 'lodash';
import { Classes, Checkbox, FormGroup, Intent } from '@blueprintjs/core';
import { CellType } from '@/constants';
import { DataTableCellProps } from './cellProps';

const CheckboxEditableCell = ({
  row: { index, original },
  column: { id, disabledAccessor, checkboxProps },
  cell: { value: initialValue },
  payload,
}: DataTableCellProps) => {
  const [value, setValue] = React.useState(initialValue);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;

    setValue(newValue);
    payload.updateData(index, id, newValue);
  };

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const error = payload.errors?.[index]?.[id];

  // Detarmines whether the checkbox is disabled.
  const disabled = disabledAccessor ? get(original, disabledAccessor) : false;

  return (
    <FormGroup
      intent={error ? Intent.DANGER : undefined}
      className={classNames(Classes.FILL)}
    >
      <Checkbox
        value={value}
        onChange={onChange}
        checked={initialValue}
        disabled={disabled}
        minimal={true}
        className="ml2"
        {...checkboxProps}
      />
    </FormGroup>
  );
};

CheckboxEditableCell.cellType = CellType.Field;

export default CheckboxEditableCell;
