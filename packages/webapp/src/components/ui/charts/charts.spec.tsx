import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      (
        ({
          'charts.view': 'Вид графика',
          'charts.view.chart': 'График',
          'charts.view.table': 'Таблица',
          'charts.show': 'Показать график',
          'charts.hide': 'Свернуть',
          'charts.error': 'Не удалось загрузить график',
          'charts.empty': 'За этот период данных нет',
          'charts.other': 'Прочее',
          'screen_state.retry': 'Повторить',
          'compact.thousand': 'тыс.',
          'compact.million': 'млн',
          'compact.billion': 'млрд',
        }) as Record<string, string>
      )[key] ?? key,
  },
}));
vi.mock('@/utils/organizationMoney', () => ({
  organizationCurrency: () => 'RUB',
  formatOrganizationMoney: (value: number) => `${value} ₽`,
}));

import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { formatAxisMoney, formatAxisPercent, topSlices } from './chartFormat';
import { tickInterval } from './useChartSize';

const table = {
  columns: [
    { key: 'month', label: 'Период' },
    { key: 'value', label: 'Сумма', numeric: true },
  ],
  rows: [
    { month: 'янв', value: 10 },
    { month: 'фев', value: 20 },
  ],
};

beforeEach(() => window.localStorage.clear());

describe('подписи осей', () => {
  it('деньги коротко, минус типографский', () => {
    expect(formatAxisMoney(1_600_000)).toMatch(/^1,6\s+млн\s+₽$/);
    expect(formatAxisMoney(250_000)).toMatch(/^250\s+тыс\.\s+₽$/);
    expect(formatAxisMoney(0)).toMatch(/^0\s+₽$/);
    expect(formatAxisMoney(-1_500_000).startsWith('−')).toBe(true);
  });

  it('доля — проценты с пробелом', () => {
    expect(formatAxisPercent(0.125)).toMatch(/^12,5\s%$/);
  });

  it('круговая: пять долей и «Прочее»', () => {
    const slices = topSlices(
      [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, label: `д${value}` })),
    );
    expect(slices).toHaveLength(6);
    expect(slices[5]).toMatchObject({ label: 'Прочее', value: 3, other: true });
  });

  it('на телефоне не больше шести подписей', () => {
    expect(tickInterval(12, 6)).toBe(1);
    expect(tickInterval(30, 6)).toBe(4);
    expect(tickInterval(5, 6)).toBe(0);
  });
});

describe('ChartCard', () => {
  it('«Таблица» показывает те же числа таблицей', () => {
    render(
      <ChartCard title="Деньги по месяцам" table={table}>
        {() => <div data-testid="chart" />}
      </ChartCard>,
    );
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Таблица' }));
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByRole('table')).toHaveTextContent('фев');
  });

  it('загрузка — скелет; ошибка — словами и «Повторить»; пусто — строкой', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ChartCard title="Г" table={table} state="loading">
        {() => <div data-testid="chart" />}
      </ChartCard>,
    );
    expect(screen.queryByTestId('chart')).toBeNull();
    rerender(
      <ChartCard title="Г" table={table} state="error" onRetry={onRetry}>
        {() => <div />}
      </ChartCard>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalled();
    rerender(
      <ChartCard title="Г" table={table} state="empty">
        {() => <div />}
      </ChartCard>,
    );
    expect(screen.getByText('За этот период данных нет')).toBeInTheDocument();
  });

  it('сворачиваемый график запоминает выбор', () => {
    const card = (
      <ChartCard title="Г" table={table} collapsible={{ storageKey: 'k', defaultCollapsed: false }}>
        {() => <div data-testid="chart" />}
      </ChartCard>
    );
    const { unmount } = render(card);
    fireEvent.click(screen.getByRole('button', { name: /Свернуть/ }));
    expect(screen.queryByTestId('chart')).toBeNull();
    unmount();
    render(card);
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByRole('button', { name: /Показать график/ })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('ChartTooltip', () => {
  it('разрыв (пустое значение) не печатается нулём; служебный ряд скрыт', () => {
    render(
      <ChartTooltip
        active
        label="март"
        hideKeys={['base']}
        payload={[
          { name: 'Факт', value: 100, dataKey: 'fact', color: 'red' },
          { name: 'План', value: null, dataKey: 'plan' },
          { name: 'Подставка', value: 5, dataKey: 'base' },
        ]}
      />,
    );
    expect(screen.getByText('100 ₽')).toBeInTheDocument();
    expect(screen.queryByText('План')).toBeNull();
    expect(screen.queryByText('Подставка')).toBeNull();
  });
});
