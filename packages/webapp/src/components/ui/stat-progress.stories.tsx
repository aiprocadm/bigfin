import type { Meta, StoryObj } from '@storybook/react';

import { StatCard } from './stat-card';
import { ProgressBar, ProgressRing } from './progress';

/**
 * Показатель и выполнение плана. Рядом стоят случаи, которые легко
 * перепутать: рост расходов (плохо) и рост доходов (хорошо), нет базы и ноль.
 */
const meta = {
  title: 'UI/StatCard и прогресс',
  component: StatCard,
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tiles: Story = {
  args: { label: 'Доходы', value: '1 150 000,00 ₽' },
  render: () => (
    <div className="bigfin-ui grid max-w-3xl grid-cols-3 gap-3 p-4">
      <StatCard label="Доходы" value="1 150 000,00 ₽" changePercent={12.4} changeLabel="к августу" sense="income" sparkline={[3, 5, 4, 7, 9]} />
      <StatCard label="Расходы" value="890 000,00 ₽" changePercent={8.1} changeLabel="к августу" sense="expense" />
      <StatCard label="Прибыль" value="−20 000,00 ₽" changePercent={null} sense="income" />
    </div>
  ),
};

export const Rings: Story = {
  args: { label: 'Кольца', value: null },
  render: () => (
    <div className="bigfin-ui flex items-center gap-6 p-4">
      <ProgressRing
        rings={[
          { label: 'Доходы', value: 0.56, tone: 'chart-2' },
          { label: 'Расходы', value: 0.81, tone: 'chart-4' },
          { label: 'Прибыль', value: null, tone: 'chart-1' },
        ]}
      >
        <span className="text-title-3">56 %</span>
        <span className="text-caption text-text-muted">доходы</span>
      </ProgressRing>
      <div className="flex w-64 flex-col gap-3">
        <ProgressBar label="Расходы" value={0.9} expected={0.72} tone="chart-4" />
        <ProgressBar label="Доходы" value={0.56} expected={0.72} tone="chart-2" />
        <ProgressBar label="Реклама" value={null} />
      </div>
    </div>
  ),
};
