import type { Meta, StoryObj } from '@storybook/react';

import { ReportPeriodBar } from './ReportPeriodBar';
import { reportRange } from './reportPeriod';

/**
 * Полоса периода отчёта: шесть готовых периодов и подпись текущего отрезка.
 */
const meta: Meta<typeof ReportPeriodBar> = {
  title: 'Bigfin/Полоса периода',
  component: ReportPeriodBar,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bigfin-ui bg-background p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReportPeriodBar>;

export const ГотовыйПериод: Story = {
  args: {
    range: reportRange('quarter'),
    onCustomizeClick: () => undefined,
  },
};

export const ПроизвольныйОтрезок: Story = {
  args: {
    range: { fromDate: '2026-10-03', toDate: '2026-10-20' },
    onCustomizeClick: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Ни одна кнопка не выглядит нажатой: нажатая обещала бы, что '
          + 'показан именно её период.',
      },
    },
  },
};
