import React, { useCallback, useState, useEffect } from 'react';
import { FormGroup, Intent } from '@blueprintjs/core';

import { MoneyInputGroup } from '@/components';
import { CellType } from '@/constants';
import { DataTableCellProps } from './cellProps';

const PercentFieldCell = ({
  cell: { value: initialValue },
  row: { index },
  column: { id },
  payload: { errors, updateData },
}: DataTableCellProps) => {
  const [value, setValue] = useState(initialValue);

  const handleBlurChange = (newValue?: string) => {
    // Пустое поле — это пустое значение, а НЕ ноль: «не указали» и
    // «указали ноль процентов» в отчётах читаются по-разному.
    const parsedValue =
      newValue === '' || newValue === undefined ? '' : parseInt(newValue, 10);

    updateData(index, id, parsedValue);
  };

  const handleChange = useCallback((value?: string) => {
    setValue(value);
  }, [setValue]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const error = errors?.[index]?.[id];

  return (
    <FormGroup intent={error ? Intent.DANGER : undefined}>
      <MoneyInputGroup
        prefix={'%'}
        value={value}
        onChange={handleChange}
        onBlurValue={handleBlurChange}
      />
    </FormGroup>
  );
};

PercentFieldCell.cellType = CellType.Field;

export default PercentFieldCell;
