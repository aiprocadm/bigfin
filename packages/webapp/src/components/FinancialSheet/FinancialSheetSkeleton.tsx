import React from 'react';
import styled from 'styled-components';

import { Align, TableStyle } from '@/constants';
import { SkeletonText } from '@/components';
import {
  DataTable,
  TableSkeletonRows,
  TableSkeletonHeader,
} from '../Datatable';

import {
  FinancialSheetRoot,
  FinancialSheetTitle,
  FinancialSheetType,
  FinancialSheetDate,
  FinancialSheetTable,
} from './StyledFinancialSheet';

/**
 * Financial sheet paper skeleton.
 * @returns {React.JSX}
 */
/**
 * Свойства заглушки отчёта. Все необязательные: во всех местах продукта
 * заглушка ставится как `<FinancialSheetSkeleton />` — без единого свойства
 * (Д1 карты v62).
 */
export interface FinancialSheetSkeletonProps {
  minimal?: boolean;
  fullWidth?: boolean;
  titleCharsLength?: number;
  typeCharsLength?: number;
  dateCharsLength?: number;
  skeletonTableColumns?: any;
}

export function FinancialSheetSkeleton({
  minimal,
  fullWidth,
  titleCharsLength,
  typeCharsLength,
  dateCharsLength,
  skeletonTableColumns,
}: FinancialSheetSkeletonProps) {
  return (
    <FinancialSheetRoot minimal={minimal} fullWidth={fullWidth}>
      <FinancialSheetTitle>
        <SkeletonText charsLength={titleCharsLength} />
      </FinancialSheetTitle>

      <FinancialSheetType>
        <SkeletonText charsLength={typeCharsLength} />
      </FinancialSheetType>

      <FinancialSheetDate>
        <SkeletonText charsLength={dateCharsLength} />
      </FinancialSheetDate>

      <FinancialSheetTable>
        <FinancialSkeletonTable
          columns={skeletonTableColumns}
          data={[]}
          noInitialFetch={true}
          expandable={true}
          styleName={TableStyle.Constrant}
          TableLoadingRenderer={TableSkeletonRows}
          TableHeaderSkeletonRenderer={TableSkeletonHeader}
          headerLoading={true}
          loading={true}
        />
      </FinancialSheetTable>
    </FinancialSheetRoot>
  );
}

FinancialSheetSkeleton.defaultProps = {
  titleCharsLength: 20,
  typeCharsLength: 40,
  dateCharsLength: 20,
  skeletonTableColumns: [
    {
      id: 'skeleton-1',
      className: 'skeleton-1',
    },
    {
      id: 'skeleton-2',
      className: 'skeleton-2',
      align: Align.Right,
    },
  ],
};

const FinancialSkeletonTable = styled(DataTable)`
  .table .th .skeleton,
  .table .td .skeleton {
    margin-top: 4px;
    margin-bottom: 4px;
  }
`;
