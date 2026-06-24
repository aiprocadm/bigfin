import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from './date-picker';
import { Calendar } from './calendar';

const meta = {
  title: 'UI/DatePicker',
  component: DatePicker,
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(
      new Date(2026, 5, 24),
    );
    return (
      <div className="w-64">
        <DatePicker value={date} onChange={setDate} />
      </div>
    );
  },
};

export const CalendarInline: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(
      new Date(2026, 5, 24),
    );
    return (
      <div className="inline-block rounded-lg border border-border bg-surface">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </div>
    );
  },
};
