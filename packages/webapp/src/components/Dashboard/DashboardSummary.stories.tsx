import type { Meta, StoryObj } from '@storybook/react';
import { DashboardSummary } from './DashboardSummary';

const meta = {
  title: 'Dashboard/DashboardSummary',
  component: DashboardSummary,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    metrics: {
      income: 842500,
      expense: 511300,
      profit: 331200,
      balance: 1284600,
    },
    chart: [
      { month: 'Янв', income: 620000, expense: 480000 },
      { month: 'Фев', income: 710000, expense: 505000 },
      { month: 'Мар', income: 680000, expense: 520000 },
      { month: 'Апр', income: 790000, expense: 498000 },
      { month: 'Май', income: 905000, expense: 540000 },
      { month: 'Июн', income: 842500, expense: 511300 },
    ],
  },
};
