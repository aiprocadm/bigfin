import * as React from 'react';

import { cn } from '@/lib/cn';

export interface ChartColumn<Row> {
  key: string;
  label: React.ReactNode;
  /** Как печатать ячейку. По умолчанию — как есть. */
  render?: (row: Row) => React.ReactNode;
  /** Числа — вправо. */
  numeric?: boolean;
}

export interface ChartDataTableProps<Row> {
  caption: React.ReactNode;
  columns: ChartColumn<Row>[];
  rows: Row[];
  className?: string;
}

/**
 * Тот же график таблицей (§6.1, P10): для «Таблица», для чтения с экрана,
 * для печати. У каждого графика она есть — правило 9.
 */
export function ChartDataTable<Row extends Record<string, any>>({
  caption,
  columns,
  rows,
  className,
}: ChartDataTableProps<Row>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-subhead">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-2 py-1.5 text-footnote font-medium text-text-secondary',
                  column.numeric ? 'text-right' : 'text-left',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border last:border-b-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-2 py-1.5 text-text-primary',
                    column.numeric ? 'text-right tabular-nums' : 'text-left',
                  )}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
