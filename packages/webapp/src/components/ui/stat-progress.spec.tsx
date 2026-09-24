import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      ({
        'stat_card.no_base': 'нет базы для сравнения',
        'stat_card.no_data': 'нет данных',
        'progress.no_plan': 'нет плана',
        'progress.expected': 'должно быть к сегодня',
      })[key] ?? key,
    getInitOptions: () => ({ currentLocale: 'ru' }),
  },
}));

import { isGoodChange, StatCard } from './stat-card';
import { formatShare, ProgressBar, ProgressRing } from './progress';

describe('StatCard', () => {
  it('нет базы — не процент, а слова', () => {
    render(<StatCard label="Доходы" value="0,00 ₽" changePercent={null} sense="income" />);

    expect(screen.getByText('нет базы для сравнения')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('изменение со знаком и типографским минусом', () => {
    render(<StatCard label="Расходы" value="100 ₽" changePercent={-12.5} changeLabel="к августу" sense="expense" />);

    expect(screen.getByText('−12,5 %')).toBeInTheDocument();
    expect(screen.getByText('к августу')).toBeInTheDocument();
  });

  it('нет значения — «нет данных»', () => {
    render(<StatCard label="LTV" value={null} />);
    expect(screen.getByText('нет данных')).toBeInTheDocument();
  });
});

describe('хорошее изменение', () => {
  it.each([
    ['income', 10, true],
    ['income', -10, false],
    ['expense', -10, true],
    ['expense', 10, false],
    ['income', 0, false],
    ['neutral', 10, false],
  ] as const)('%s %s → %s', (sense, percent, good) => {
    expect(isGoodChange(sense, percent)).toBe(good);
  });
});

describe('ProgressRing и ProgressBar', () => {
  it('доля словами; нет плана — «нет плана», не процент', () => {
    expect(formatShare(0.56)).toBe('56 %');
    expect(formatShare(1.12)).toBe('112 %');
    expect(formatShare(null)).toBe('нет плана');
  });

  it('кольца — картинка с подписью всех колец для экранного диктора', () => {
    render(
      <ProgressRing
        rings={[
          { label: 'Доходы', value: 0.56, tone: 'chart-2' },
          { label: 'Расходы', value: null, tone: 'chart-3' },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Доходы: 56 %, Расходы: нет плана' })).toBeInTheDocument();
  });

  it('больше трёх колец не рисуется', () => {
    const { container } = render(
      <ProgressRing
        rings={['a', 'b', 'c', 'd'].map((label) => ({ label, value: 0.5, tone: 'chart-1' as const }))}
      />,
    );
    expect(container.querySelectorAll('g')).toHaveLength(3);
  });

  it('полоса — progressbar со значением и отметкой «должно быть к сегодня»', () => {
    render(<ProgressBar label="Расходы" value={0.9} expected={0.72} />);

    const bar = screen.getByRole('progressbar', { name: 'Расходы' });
    expect(bar).toHaveAttribute('aria-valuenow', '90');
    expect(screen.getByTestId('progress-expected')).toHaveStyle({ left: 'calc(72% - 1px)' });
  });

  it('нет плана — без значения и без отметки', () => {
    render(<ProgressBar label="Доходы" value={null} />);

    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByTestId('progress-expected')).toBeNull();
  });
});
