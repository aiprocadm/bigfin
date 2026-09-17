import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { Classes, InputGroup, FormGroup, Intent } from '@blueprintjs/core';
import { CellType } from '@/constants';

/**
 * Что таблица передаёт редактируемой ячейке: положение, значение и «груз»
 * таблицы с обновлением строки и ошибками по строкам.
 */
export interface EditableCellProps {
  row: { index: number };
  column: { id: string };
  cell: { value: string };
  payload: {
    updateData: (index: number, columnId: string, value: string) => void;
    errors?: Record<number, Record<string, unknown> | undefined>;
  };
}

const InputEditableCell = ({
  row: { index },
  column: { id },
  cell: { value: initialValue },
  payload,
}: EditableCellProps) => {
  const [value, setValue] = useState(initialValue);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };
  const onBlur = () => {
    payload.updateData(index, id, value);
  };
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const error = payload.errors?.[index]?.[id];

  return (
    <FormGroup
      intent={error ? Intent.DANGER : undefined}
      className={classNames(Classes.FILL)}
    >
      <InputGroup
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        fill={true}
      />
    </FormGroup>
  );
};

InputEditableCell.cellType = CellType.Field;

export default InputEditableCell;
