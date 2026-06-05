import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Building2 } from 'lucide-react';
import { ListView } from './list-view';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const meta: Meta<typeof ListView> = {
  title: 'UI/ListView',
  component: ListView,
};
export default meta;

const data = [
  { id: 1, display_name: 'ООО «Ромашка»', company_name: 'Ромашка', work_phone: '+7 495 123-45-67', closing_balance: 124500, currency_code: 'RUB', active: true },
  { id: 2, display_name: 'ИП Сидоров А.В.', company_name: '', work_phone: '+7 916 555-22-11', closing_balance: -8200, currency_code: 'RUB', active: true },
  { id: 3, display_name: 'ООО «ТехноСтрой»', company_name: 'ТехноСтрой', work_phone: '+7 812 700-10-20', closing_balance: 0, currency_code: 'RUB', active: false },
];

const columns = [
  { id: 'display_name', Header: 'Название', accessor: 'display_name' },
  { id: 'company_name', Header: 'Компания', accessor: 'company_name' },
  { id: 'work_phone', Header: 'Телефон', accessor: 'work_phone', disableSortBy: true },
  { id: 'balance', Header: 'Баланс', accessor: 'closing_balance', align: 'right' },
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

export const Default: StoryObj<typeof ListView> = {
  render: () => {
    const [search, setSearch] = React.useState('');
    const [selected, setSelected] = React.useState<string[]>([]);
    return (
      <ListView
        title="Поставщики"
        primaryAction={{ label: 'Новый поставщик', onClick: () => {} }}
        columns={columns}
        data={data}
        getRowId={(r) => String(r.id)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по странице…"
        selectedIds={selected}
        onSelectionChange={setSelected}
        bulkDelete={{ label: 'Удалить выбранные', onClick: () => {} }}
        pageIndex={0}
        pageSize={20}
        pageCount={1}
        total={3}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onRowClick={() => {}}
      />
    );
  },
};

export const Empty: StoryObj<typeof ListView> = {
  render: () => (
    <ListView
      title="Поставщики"
      columns={columns}
      data={[]}
      getRowId={(r) => String(r.id)}
      search=""
      onSearchChange={() => {}}
      selectedIds={[]}
      onSelectionChange={() => {}}
      pageIndex={0}
      pageSize={20}
      pageCount={1}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      emptyState={
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Пока нет поставщиков"
          description="Добавьте первого поставщика, чтобы начать."
        />
      }
    />
  ),
};
