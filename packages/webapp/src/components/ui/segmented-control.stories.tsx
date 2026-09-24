import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { SegmentedControl } from './segmented-control';

/**
 * Сегменты — выбор одного вида из нескольких. Больше пяти — листаются вбок.
 */
const meta = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const Live = (props: { options: { value: string; label: string }[]; fullWidth?: boolean; size?: 'sm' | 'md' }) => {
  const [value, setValue] = React.useState(props.options[0].value);
  return (
    <div className="bigfin-ui w-[360px] p-4">
      <SegmentedControl aria-label="Пример" value={value} onChange={setValue} {...props} />
    </div>
  );
};

const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
];

export const Period: Story = {
  args: { options: PERIODS, value: 'month', onChange: () => {}, 'aria-label': 'Период' },
  render: () => <Live options={PERIODS} />,
};

export const FullWidthSmall: Story = {
  args: { options: PERIODS, value: 'month', onChange: () => {}, 'aria-label': 'Тип' },
  render: () => (
    <Live
      size="sm"
      fullWidth
      options={[
        { value: 'all', label: 'Все' },
        { value: 'in', label: 'Приход' },
        { value: 'out', label: 'Расход' },
      ]}
    />
  ),
};

export const ManySegmentsScroll: Story = {
  args: { options: PERIODS, value: 'articles', onChange: () => {}, 'aria-label': 'Группировка' },
  render: () => (
    <Live
      options={[
        { value: 'articles', label: 'Статьи' },
        { value: 'activities', label: 'Виды деятельности' },
        { value: 'contacts', label: 'Контрагенты' },
        { value: 'accounts', label: 'Счета' },
        { value: 'projects', label: 'Направления' },
        { value: 'projects_articles', label: 'Направления и статьи' },
      ]}
    />
  ),
};
