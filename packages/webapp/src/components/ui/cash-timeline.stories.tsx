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
    verdict: 'денег хватит до 30 октября',
    lastFormatted: '1 020 000 ₽',
    lastDayLabel: '30 октября',
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
    verdict: '10 октября не хватит 45 000 ₽',
    verdictIsProblem: true,
    lastFormatted: '−50 000 ₽',
    lastDayLabel: '30 октября',
    points: series([
      410500, 380000, 330000, 290000, 240000, 180000, 120000, 60000, 10000,
      -45000, -120000, -90000, -40000, 20000, 80000, 140000, 90000, 40000,
      -20000, -80000, -30000, 30000, 90000, 150000, 210000, 160000, 110000,
      60000, 10000, -50000,
    ]),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Ноль ОБЯЗАТЕЛЬНО входит в шкалу, как только прогноз уходит в минус: '
          + 'зона ниже нуля залита тревожным цветом, и путь видно, как он в неё '
          + 'заходит. Вердикт словами называет день и сумму нехватки.',
      },
    },
  },
};

export const БольшойЗапас: Story = {
  args: {
    balanceFormatted: '48 200 000 ₽',
    verdict: 'денег хватит до 30 октября',
    lastFormatted: '46 460 000 ₽',
    lastDayLabel: '30 октября',
    points: series(
      Array.from({ length: 30 }, (_, i) => 48200000 - i * 60000),
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'ЭТОТ СЛУЧАЙ И БЫЛ СЛОМАН. Раньше здесь рисовалась ровная стена: '
          + 'ноль держали в шкале, и падение на 3,6 % давало пару точек высоты. '
          + 'Правило «ноль всегда в шкале» было написано для СТОЛБИКОВ — столбик '
          + 'меряется длиной от нуля. Линия меряется положением, поэтому честно '
          + 'строится по размаху данных, а концы пути подписаны числами: без них '
          + 'падение на 3 % и падение на 99 % выглядели бы одинаково.',
      },
    },
  },
};

export const ОстатокНеМеняется: Story = {
  args: {
    balanceFormatted: '1 240 500 ₽',
    verdict: 'денег хватит до 30 октября',
    lastFormatted: '1 240 500 ₽',
    lastDayLabel: '30 октября',
    points: series(Array.from({ length: 30 }, () => 1240500)),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Ровный прогноз — это ОТВЕТ, а не отсутствие ответа: впереди нет '
          + 'запланированных платежей. Прямая линия и подпись об этом прямо '
          + 'говорят.',
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
