import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './data-table';
import { Badge } from './badge';

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

const data = [
  { id: 1, display_name: 'ООО «Ромашка»', email: 'info@romashka.ru', phone: '+7 495 123-45-67', balance: '124 500 ₽', active: true },
  { id: 2, display_name: 'ИП Сидоров А.В.', email: 'sidorov@mail.ru', phone: '+7 916 555-22-11', balance: '−8 200 ₽', active: true },
  { id: 3, display_name: 'ООО «ТехноСтрой»', email: 'buh@technostroy.ru', phone: '+7 812 700-10-20', balance: '0 ₽', active: false },
  { id: 4, display_name: 'Кафе «Уют»', email: 'cafe.uyut@yandex.ru', phone: '+7 999 888-77-66', balance: '45 300 ₽', active: true },
];

const columns = [
  { id: 'display_name', Header: 'Название', accessor: 'display_name' },
  { id: 'email', Header: 'Email', accessor: 'email', disableSortBy: true },
  { id: 'phone', Header: 'Телефон', accessor: 'phone', disableSortBy: true },
  { id: 'balance', Header: 'Баланс', accessor: 'balance', align: 'right' },
  {
    id: 'status',
    Header: 'Статус',
    accessor: 'active',
    disableSortBy: true,
    Cell: ({ row: { original } }: any) => (
      <Badge variant={original.active ? 'secondary' : 'outline'}>
        {original.active ? 'Активен' : 'Неактивен'}
      </Badge>
    ),
  },
];

export const CustomersExample: StoryObj<typeof DataTable> = {
  render: () => {
    const [selected, setSelected] = React.useState<string[]>([]);
    return (
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => String(r.id)}
        enableSelection
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowClick={() => {}}
      />
    );
  },
};

export const Loading: StoryObj<typeof DataTable> = {
  args: { columns, data: [], getRowId: (r: any) => String(r.id), loading: true },
};
