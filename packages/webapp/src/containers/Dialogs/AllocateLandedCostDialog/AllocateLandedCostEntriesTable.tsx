import React from 'react';
import styled from 'styled-components';

import { DataTableEditable } from '@/components';

import { compose, updateTableCell } from '@/utils';
import { useAllocateLandedCostEntriesTableColumns } from './utils';

/**
 * Allocate landed cost entries table.
 */
export default function AllocateLandedCostEntriesTable({
  onUpdateData,
  entries,
}: any) {
  // Allocate landed cost entries table columns.
  const columns = useAllocateLandedCostEntriesTableColumns();

  // Handle update data.
  const handleUpdateData = React.useCallback(
    (rowIndex: any, columnId: any, value: any) => {
      const newRows = compose(updateTableCell(rowIndex, columnId, value))(
        entries,
      );
      onUpdateData(newRows);
    },
    [onUpdateData, entries],
  );

  return (
    <AllocateLandeedCostEntriesEditableTable
      columns={columns}
      data={entries}
      payload={{
        errors: [],
        updateData: handleUpdateData,
      }}
    />
  );
}

export const AllocateLandeedCostEntriesEditableTable = styled(
  DataTableEditable,
)`
  .table {
    .thead .tr .th {
      padding-top: 8px;
      padding-bottom: 8px;
    }

    .tbody .tr .td {
      padding: 0.25rem;
    }
  }
`;
