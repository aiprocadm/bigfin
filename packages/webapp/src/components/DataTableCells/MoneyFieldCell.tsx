import React, { useCallback, useState, useEffect } from 'react';
import { FormGroup, Intent } from '@blueprintjs/core';

import { MoneyInputGroup } from '@/components';
import { CLASSES } from '@/constants/classes';
import { CellType } from '@/constants';
import { DataTableCellProps } from './cellProps';

// Input form cell renderer.
const MoneyFieldCellRenderer = ({
  row: { index, moneyInputGroupProps = {} },
  column: { id },
  cell: { value: initialValue },
  payload: { errors, updateData },
}: DataTableCellProps) => {
  const [value, setValue] = useState(initialValue);

  const handleFieldChange = useCallback((value: string | number) => {
    setValue(value);
  }, [setValue]);

  // Проверка «это число» принимает и строку из поля, и уже готовое число.
  // `parseFloat` и `isFinite` объявлены под строку и число соответственно,
  // поэтому приводим явно — вместо того чтобы прятать вопрос под `any`.
  function isNumeric(data: string | number) {
    return (
      !isNaN(parseFloat(String(data))) &&
      isFinite(Number(data)) &&
      data.constructor !== Array
    );
  }

  const handleFieldBlur = () => {
    const updateValue = isNumeric(value) ? parseFloat(value) : value;
    updateData(index, id, updateValue);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const error = errors?.[index]?.[id];

  return (
    <FormGroup
      intent={error ? Intent.DANGER : undefined}
      className={CLASSES.FILL}>
      <MoneyInputGroup
        value={value}
        // prefix={'$'}
        onChange={handleFieldChange}
        onBlur={handleFieldBlur}
        {...moneyInputGroupProps}
      />
    </FormGroup>
  );
};

MoneyFieldCellRenderer.cellType = CellType.Field;

export default MoneyFieldCellRenderer;
