import React from 'react';
import { Checkbox } from '@blueprintjs/core';

export default function TableIndeterminateCheckboxHeader({
  getToggleAllRowsSelectedProps,
}: any) {
  return (
    <div>
      <Checkbox  {...getToggleAllRowsSelectedProps()} />
    </div>
  );
}
