import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReportTable, type ReportTableColumn } from './report-table';

/**
 * Ячейки общей таблицы отчётов (этап 31 ТЗ-3): раскрытие одной ячейки
 * (FT-004), доля под суммой (FT-003), подсветка выходного (FT-006b) и
 * строки, на которую пришли по ссылке.
 */
const COLUMNS: ReportTableColumn[] = [
  { key: 'name', label: 'Статья', cellIndex: 0 },
  { key: 'p0', label: 'Январь', cellIndex: 1, align: 'right' },
  { key: 'p1', label: 'Суббота', cellIndex: 2, align: 'right', highlight: true },
];

const ROWS = [
  {
    id: 'article-1',
    cells: [
      { key: 'name', value: 'Аренда' },
      { key: 'p0', value: '100', note: '25,00 %' },
      { key: 'p1', value: '200' },
    ],
  },
  {
    id: 'net',
    cells: [
      { key: 'name', value: 'Чистый поток' },
      { key: 'p0', value: '300' },
      { key: 'p1', value: '400' },
    ],
  },
];

describe('ReportTable — ячейки', () => {
  it('раскрываемая ячейка — кнопка; щелчок сообщает строку И колонку', () => {
    const onCellClick = vi.fn();
    render(
      <ReportTable
        columns={COLUMNS}
        rows={ROWS}
        onCellClick={onCellClick}
        canDrillDownCell={(row) => row.id === 'article-1'}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '200' }));

    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onCellClick.mock.calls[0][0].id).toBe('article-1');
    expect(onCellClick.mock.calls[0][1].key).toBe('p1');
    // Итог не раскрывается: у него нет своих операций.
    expect(screen.queryByRole('button', { name: '400' })).toBeNull();
  });

  it('без обработчика ячейки — обычный текст, как раньше', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.queryByRole('button', { name: '200' })).toBeNull();
  });

  it('доля — второй строкой под суммой', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} />);

    const cell = screen.getByText('25,00 %').closest('td')!;
    expect(cell.textContent).toContain('100');
  });

  it('подсвеченная колонка — и в шапке, и в ячейках', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.getByText('Суббота').closest('th')!.className).toContain('bg-surface-elevated');
    expect(screen.getByText('200').closest('td')!.className).toContain('bg-surface-elevated');
    expect(screen.getByText('Январь').closest('th')!.className).not.toContain('bg-surface-elevated');
  });

  it('строка, на которую пришли по ссылке, выделена', () => {
    const { container } = render(
      <ReportTable columns={COLUMNS} rows={ROWS} highlightRowId="article-1" />,
    );

    expect(container.querySelector('[data-row-id="article-1"]')!.className).toContain('bg-action/10');
    expect(container.querySelector('[data-row-id="net"]')!.className).not.toContain('bg-action/10');
  });
});
