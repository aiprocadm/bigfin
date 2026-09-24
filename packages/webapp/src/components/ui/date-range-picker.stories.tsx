import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DateRangePicker } from './date-range-picker';
import type { DateRange } from './date-range';

/**
 * Период одним полем: стрелки сдвигают месяц на месяц, по нажатию — готовые
 * варианты и календарь.
 */
const meta = {
  title: 'UI/DateRangePicker',
  component: DateRangePicker,
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const Live = ({ initial, showArrows = true }: { initial: DateRange; showArrows?: boolean }) => {
  const [value, setValue] = React.useState(initial);
  return (
    <div className="bigfin-ui p-4">
      <DateRangePicker value={value} onChange={setValue} today="2026-09-24" showArrows={showArrows} />
    </div>
  );
};

export const Month: Story = {
  args: { value: { from: '2026-09-01', to: '2026-09-30' }, onChange: () => {} },
  render: () => <Live initial={{ from: '2026-09-01', to: '2026-09-30' }} />,
};

export const AcrossMonths: Story = {
  args: { value: { from: '2026-09-15', to: '2026-10-14' }, onChange: () => {} },
  render: () => <Live initial={{ from: '2026-09-15', to: '2026-10-14' }} />,
};

export const WithoutArrows: Story = {
  args: { value: { from: '2026-01-01', to: '2026-12-31' }, onChange: () => {} },
  render: () => <Live initial={{ from: '2026-01-01', to: '2026-12-31' }} showArrows={false} />,
};
