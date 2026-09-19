import type { Meta, StoryObj } from '@storybook/react';

import { CashTimeline } from './cash-timeline';

/**
 * Лента денег — герой главной страницы.
 *
 * Показывает не «сколько сейчас», а «доживу ли до конца месяца».
 */
const meta: Meta<typeof CashTimeline> = {
  title: 'Bigfin/Лента денег',
  component: CashTimeline,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof CashTimeline>;

/** Ряд остатка по дням: начинается с суммы и постепенно тратится. */
const series = (values: number[]) =>
  values.map((balance, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, '0')}`,
    balance,
  }));

export const ДенегХватает: Story = {
  args: {
    balanceFormatted: '1 240 500 ₽',
    points: series([
      1240500, 1180000, 1180000, 1420000, 1380000, 1310000, 1290000, 1240000,
      1180000, 1120000, 1480000, 1440000, 1390000, 1350000, 1310000, 1260000,
      1210000, 1170000, 1520000, 1480000, 1430000, 1380000, 1340000, 1290000,
      1240000, 1200000, 1150000, 1110000, 1070000, 1020000,
    ]),
  },
};

export const КассовыйРазрыв: Story = {
  args: {
    balanceFormatted: '410 500 ₽',
    points: series([
      410500, 380000, 330000, 290000, 240000, 180000, 120000, 60000, 10000,
      -45000, -120000, -90000, -40000, 20000, 80000, 140000, 90000, 40000,
      -20000, -80000, -30000, 30000, 90000, 150000, 210000, 160000, 110000,
      60000, 10000, -50000,
    ]),
    gapDate: '2026-10-10',
    gapNote: 'Денег не хватит 10 октября',
  },
};

export const БольшойЗапас: Story = {
  args: {
    balanceFormatted: '48 200 000 ₽',
    points: series(
      Array.from({ length: 30 }, (_, i) => 48200000 - i * 60000),
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Лента намеренно выглядит ровной: ноль всегда в шкале, и у бизнеса '
          + 'с большим запасом всё и правда ровно. Подгонка шкалы под минимум '
          + 'и максимум нарисовала бы обрыв там, где его нет.',
      },
    },
  },
};

export const ПрогнозаНет: Story = {
  args: {
    balanceFormatted: '1 240 500 ₽',
    points: [],
    fallback: (
      <p className="mt-4 max-w-[60ch] text-sm text-text-secondary">
        Чтобы видеть, хватит ли денег на ближайший месяц, включите платёжный
        календарь.
      </p>
    ),
  },
};
