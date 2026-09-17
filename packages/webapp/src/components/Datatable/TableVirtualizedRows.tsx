import React, { useContext } from 'react';
import { WindowScroller, AutoSizer, List } from 'react-virtualized';
import type { ListRowProps } from 'react-virtualized';
import { CLASSES } from '@/constants/classes';
import TableContext from './TableContext';

/** Свойства строки — те, что даёт список, без `key` (его ставит отрисовщик). */
type TableVirtualizedListRowProps = Omit<ListRowProps, 'key'>;

/**
 * Table virtualized list row.
 */
function TableVirtualizedListRow({ index, style }: TableVirtualizedListRowProps) {
  const {
    table: { page, prepareRow },
    props: { TableRowRenderer },
  } = useContext(TableContext);

  const row = page[index];
  prepareRow(row);

  return <TableRowRenderer row={row} style={style} />;
}

/**
 * Table virtualized list rows.
 */
export function TableVirtualizedListRows() {
  const {
    table: { page },
    props: { vListrowHeight, vListOverscanRowCount, windowScrollerProps },
  } = useContext(TableContext);

  // Dashboard content pane.
  const scrollElement =
    windowScrollerProps?.scrollElement ||
    document.querySelector(`.${CLASSES.DASHBOARD_CONTENT_PANE}`);

  const rowRenderer = React.useCallback(
    ({ key, ...args }: ListRowProps) => (
      <TableVirtualizedListRow {...args} key={key} />
    ),
    [],
  );

  return (
    <WindowScroller scrollElement={scrollElement}>
      {({ height, isScrolling, onChildScroll, scrollTop }) => (
        <AutoSizer disableHeight>
          {({ width }) => (
            <List
              autoHeight={true}
              className={'List'}
              height={height}
              isScrolling={isScrolling}
              onScroll={onChildScroll}
              overscanRowCount={vListOverscanRowCount}
              rowCount={page.length}
              rowHeight={vListrowHeight}
              rowRenderer={rowRenderer}
              scrollTop={scrollTop}
              width={width}
            />
          )}
        </AutoSizer>
      )}
    </WindowScroller>
  );
}
