import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DateRangePicker } from './date-range-picker';
import { FilterBar } from './filter-bar';
import { Input } from './input';
import { SegmentedControl } from './segmented-control';

/**
 * Строка фильтров реестра: период, тип, поиск — в строке; остальное — в шторке.
 */
const meta = {
  title: 'UI/FilterBar',
  component: FilterBar,
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const Live = () => {
  const [range, setRange] = React.useState({ from: '2026-09-01', to: '2026-09-30' });
  const [type, setType] = React.useState('all');
  return (
    <div className="bigfin-ui p-4">
      <FilterBar activeCount={2} onReset={() => {}} filters={<p className="text-body">Статья, направление, счёт, сумма…</p>}>
        <DateRangePicker value={range} onChange={setRange} today="2026-09-24" />
        <SegmentedControl
          aria-label="Тип"
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'in', label: 'Приход' },
            { value: 'out', label: 'Расход' },
            { value: 'uncategorized', label: 'Без статьи (3)' },
          ]}
        />
        <Input className="w-56" placeholder="Поиск" />
      </FilterBar>
    </div>
  );
};

export const Registry: Story = {
  args: { children: null },
  render: () => <Live />,
};
