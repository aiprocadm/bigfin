import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportTable, type ReportTableColumn } from './report-table';

/**
 * FT-005b ТЗ-3: закреплённые шапка и первая колонка.
 *
 * В матрице «Деньги по статьям» за год — тринадцать числовых колонок. Если
 * при прокрутке вбок уезжает название строки, человек видит числа, но не
 * видит, к какой статье они относятся; если при прокрутке вниз уезжает
 * шапка — не видит, какой это месяц.
 */
const COLUMNS: ReportTableColumn[] = [
  { key: 'name', label: 'Статья', cellIndex: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({
    key: `p${i}`,
    label: `Месяц ${i + 1}`,
    cellIndex: i + 1,
    align: 'right' as const,
  })),
];

const ROWS = [
  {
    id: 'article-1',
    cells: [
      { key: 'name', value: 'Аренда' },
      ...Array.from({ length: 12 }, (_, i) => ({ key: `p${i}`, value: '100' })),
    ],
  },
  {
    id: 'closing',
    cells: [
      { key: 'name', value: 'Остаток на конец' },
      ...Array.from({ length: 12 }, (_, i) => ({ key: `p${i}`, value: '5' })),
    ],
  },
];

const cellOf = (text: string) => screen.getByText(text).closest('td, th')!;
const tableWrapper = (container: HTMLElement) =>
  container.querySelector('table')!.parentElement!;

describe('ReportTable — закреплённая первая колонка', () => {
  it('название строки и угол шапки прилипают к левому краю', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} stickyFirstColumn />);

    expect(cellOf('Аренда').className).toContain('sticky');
    expect(cellOf('Аренда').className).toContain('left-0');
    expect(cellOf('Статья').className).toContain('left-0');
    // Угол — поверх всех ячеек, иначе строки проезжают над ним.
    expect(cellOf('Статья').className).toContain('z-20');
  });

  it('у прилипшей ячейки непрозрачный фон — числа под ней не просвечивают', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} stickyFirstColumn />);

    expect(cellOf('Аренда').className).toContain('bg-surface');
    // Финальная строка — со своей плашкой, и прилипшая ячейка тоже.
    expect(cellOf('Остаток на конец').className).toContain(
      'bg-surface-elevated',
    );
  });

  it('числовые колонки не прилипают', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} stickyFirstColumn />);

    expect(cellOf('Месяц 3').className).not.toContain('sticky');
  });

  it('без флага остальные отчёты выглядят как раньше', () => {
    render(<ReportTable columns={COLUMNS} rows={ROWS} />);

    expect(cellOf('Аренда').className).not.toContain('sticky');
    expect(cellOf('Статья').className).not.toContain('sticky');
  });
});

describe('ReportTable — закреплённая шапка без виртуализации', () => {
  it('шапка прилипает, таблица прокручивается внутри своей высоты', () => {
    const { container } = render(
      <ReportTable
        columns={COLUMNS}
        rows={ROWS}
        stickyHeader
        maxBodyHeight={400}
      />,
    );

    expect(container.querySelector('thead')!.className).toContain('sticky');
    expect(tableWrapper(container).className).toContain('overflow-auto');
    expect(tableWrapper(container).style.maxHeight).toBe('400px');
  });

  it('с виртуализацией шапка прилипает, как и раньше', () => {
    const { container } = render(
      <ReportTable columns={COLUMNS} rows={ROWS} virtualized />,
    );

    expect(container.querySelector('thead')!.className).toContain('sticky');
  });

  it('без флагов шапка не прилипает и высота не ограничена', () => {
    const { container } = render(<ReportTable columns={COLUMNS} rows={ROWS} />);

    expect(container.querySelector('thead')!.className).not.toContain(
      'sticky',
    );
    expect(tableWrapper(container).style.maxHeight).toBe('');
  });
});
