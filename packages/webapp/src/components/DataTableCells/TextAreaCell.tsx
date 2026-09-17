import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { Classes, TextArea, FormGroup, Intent } from '@blueprintjs/core';
import { CellType } from '@/constants';
import type { EditableCellProps } from './InputGroupCell';

const TextAreaEditableCell = ({
  row: { index },
  column: { id },
  cell: { value: initialValue },
  payload,
}: EditableCellProps) => {
  const [value, setValue] = useState(initialValue);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      <TextArea
        growVertically={true}
        large={true}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        fill={true}
      />
    </FormGroup>
  );
};

TextAreaEditableCell.cellType = CellType.Field;

export default TextAreaEditableCell;
