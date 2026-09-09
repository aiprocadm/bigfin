import React, { useContext } from 'react';
import type { Cell, Row } from 'react-table';
import classNames from 'classnames';
import { camelCase } from 'lodash';

import { If, Skeleton } from '@/components';
import { useAppIntlContext } from '@/components/AppIntlProvider';
import TableContext from './TableContext';
import { saveInvoke, ignoreEventFromSelectors } from '@/utils';
import { isCellLoading } from './utils';
import { MoneyDisplay } from '../Money/MoneyDisplay';

const ROW_CLICK_SELECTORS_INGORED = ['.expand-toggle', '.selection-checkbox'];

/**
 * Разбор значения ячейки объявлен **статическим полем на самом рисователе**
 * (`ActionsCellRenderer.cellType = CellType.Button`), а не свойством колонки.
 * Рисователь бывает и строкой, и не задан вовсе.
 */
const cellTypeOf = (Cell: unknown): string | undefined =>
  (Cell as { cellType?: string } | undefined)?.cellType;

/**
 * Table cell.
 */
export default function TableCell({
  cell,
  row,
  index,
}: {
  cell: Cell<any>;
  row: Row<any>;
  index: number;
}) {
  const { index: rowIndex, depth, getToggleRowExpandedProps, isExpanded } = row;
  const {
    props: {
      expandToggleColumn,
      expandColumnSpace,
      expandable,
      cellsLoading,
      cellsLoadingCoords,
      onCellClick,
    },
  } = useContext(TableContext);

  const isExpandColumn = expandToggleColumn === index;
  // Ширины читались из пустого объекта `{}` — то есть настройка колонки не
  // действовала никогда, всегда брались значения по умолчанию. Соседние
  // `TableHeaderSkeleton` и `TableSkeletonRows` читают их из колонки (Д2 карты v81).
  const { skeletonWidthMax = 100, skeletonWidthMin = 40 } = cell.column;

  // Application intl context.
  const { isRTL } = useAppIntlContext();

  // Detarmines whether the current cell is loading.
  const cellLoading = isCellLoading(
    cellsLoading,
    cellsLoadingCoords,
    rowIndex,
    cell.column.id,
  );

  if (cellLoading) {
    return (
      <div
        {...cell.getCellProps({
          className: classNames(cell.column.className, 'td'),
        })}
      >
        <Skeleton minWidth={skeletonWidthMin} maxWidth={skeletonWidthMax} />
      </div>
    );
  }
  // Handle cell click action.
  const handleCellClick = (event: React.MouseEvent) => {
    if (ignoreEventFromSelectors(event, ROW_CLICK_SELECTORS_INGORED)) {
      return;
    }
    saveInvoke(onCellClick, cell, event);
  };
  const cellType = camelCase(cellTypeOf(cell.column.Cell)) || 'text';

  return (
    <div
      {...cell.getCellProps({
        className: classNames(cell.column.className, 'td', {
          'is-text-overview': cell.column.textOverview,
          clickable: cell.column.clickable,
          'align-right': cell.column.align === 'right',
          'align-center': cell.column.align === 'center',
          [`td-${cell.column.id}`]: cell.column.id,
          [`td-${cellType}-type`]: !!cellType,
        }),
        tabIndex: 0,
        onClick: handleCellClick,
      })}
    >
      <div
        className={classNames(
          {
            'text-overview': cell.column.textOverview,
          },
          'cell-inner',
        )}
        style={{
          [isRTL ? 'paddingRight' : 'paddingLeft']:
            isExpandColumn && expandable
              ? `${depth * expandColumnSpace}rem`
              : '',
        }}
      >
        {
          // Use the row.canExpand and row.getToggleRowExpandedProps prop getter
          // to build the toggle for expanding a row
        }
        <If condition={cell.row.canExpand && expandable && isExpandColumn}>
          <span
            {...getToggleRowExpandedProps({
              className: 'expand-toggle',
            })}
            style={{}}
          >
            <span
              className={classNames('expand-arrow', {
                'is-expanded': isExpanded,
              })}
            />
          </span>
        </If>

        {cell.column?.money ? (
          <MoneyDisplay>{cell.render('Cell')}</MoneyDisplay>
        ) : (
          <>{cell.render('Cell')}</>
        )}
      </div>
    </div>
  );
}
