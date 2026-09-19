import React from 'react';
import { FormGroup, Intent, Classes } from '@blueprintjs/core';
import classNames from 'classnames';

import { CellType } from '@/constants';
import { BranchSuggestField } from '../Branches';
import { DataTableCellProps } from './cellProps';

/**
 * Branches list field cell.
 * @returns
 */
export default function BranchesListFieldCell({
  column: { id },
  row: { index, original },
  payload: { branches, updateData, errors },
}: DataTableCellProps) {
  const handleBranchSelected = React.useCallback(
    (branch: { id: number }) => {
      updateData(index, 'branch_id', branch.id);
    },
    [updateData, index],
  );

  const error = errors?.[index]?.[id];

  return (
    <FormGroup
      intent={error ? Intent.DANGER : undefined}
      className={classNames(
        'form-group--select-list',
        'form-group--contacts-list',
        Classes.FILL,
      )}
    >
      <BranchSuggestField
        branches={branches}
        onBranchSelected={handleBranchSelected}
        selectedBranchId={original?.branch_id}
      />
    </FormGroup>
  );
}

BranchesListFieldCell.cellType = CellType.Field;
