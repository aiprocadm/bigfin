import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './data-table';

/**
 * Вид строки на телефоне.
 *
 * Таблица из шести столбцов на экране в 390 точек прокручивается вбок: человек
 * не видит строку целиком и не может сравнить две соседние. Когда экран умеет
 * рисовать строку блоком, на телефоне показывается список, а таблица остаётся
 * большим экранам.
 */
const columns = [
  { id: 'name', Header: 'Контрагент', accessor: 'name' },
  { id: 'amount', Header: 'Сумма', accessor: 'amount', align: 'right' },
];

const data = [
  { id: '1', name: 'ООО «Ромашка»', amount: '120 000 ₽' },
  { id: '2', name: 'ИП Петров', amount: '−45 320 ₽' },
];

const getRowId = (row: any) => row.id;

describe('DataTable: вид на телефоне', () => {
  it('без мобильного вида таблица остаётся видимой везде', () => {
    // Ни один экран не должен сломаться от того, что его ещё не приспособили.
    render(<DataTable columns={columns} data={data} getRowId={getRowId} />);

    expect(screen.getByRole('table').className).not.toContain('hidden');
  });

  it('с мобильным видом таблица прячется на узком экране', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowId={getRowId}
        renderMobileRow={(row: any) => <span>{row.name}</span>}
      />,
    );

    expect(screen.getByRole('table').className).toContain('hidden');
    expect(screen.getByRole('table').className).toContain('md:table');
  });

  it('каждая запись попадает в мобильный список', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowId={getRowId}
        renderMobileRow={(row: any) => (
          <span data-testid="mobile-row">{row.name}</span>
        )}
      />,
    );

    expect(screen.getAllByTestId('mobile-row')).toHaveLength(2);
  });

  it('пустое состояние важнее мобильного вида', () => {
    // Пустой список блоков выглядел бы как поломка, а не как «записей нет».
    render(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={getRowId}
        emptyState={<p>Операций нет</p>}
        renderMobileRow={(row: any) => <span>{row.name}</span>}
      />,
    );

    expect(screen.getByText('Операций нет')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
