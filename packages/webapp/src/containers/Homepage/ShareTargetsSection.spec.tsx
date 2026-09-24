import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ShareTargetsSection from './ShareTargetsSection';
import type { OverviewParams } from './useOverviewParams';

// Подделки ниже vitest поднимает над ввозами сам: порядок записи не важен.

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, args?: Record<string, unknown>) =>
      args ? `${key}:${Object.values(args).join(',')}` : key,
    getInitOptions: () => ({ currentLocale: 'ru' }),
  },
}));

const useDashboardOverview = vi.fn();
vi.mock('./useDashboardOverview', () => ({
  useDashboardOverview: (...args: unknown[]) => useDashboardOverview(...args),
}));

const targets = vi.fn();
vi.mock('@/hooks/query/dashboardPreferences', () => ({
  useDashboardPreferences: () => ({ data: { widgets: { order: [], hidden: [] }, targets: targets() } }),
  useSaveDashboardPreferences: () => ({ mutate: vi.fn() }),
}));

/** Доли в выручке с целью (FT-065 ТЗ-3). */
const params: OverviewParams = {
  period: { kind: 'month', fromDate: '2026-08-01', toDate: '2026-08-31' },
  choosePeriod: vi.fn(),
  compare: { kind: 'previous' },
  chooseCompare: vi.fn(),
  directionsSortBy: 'profit',
  setDirectionsSortBy: vi.fn(),
};

const renderShares = (
  shares: { expenses: number | null; payroll: number | null; payrollConfigured: boolean },
  goal: { expenseShare: number | null; payrollShare: number | null },
) => {
  targets.mockReturnValue(goal);
  useDashboardOverview.mockReturnValue({
    data: { plan: { shares } },
    isLoading: false,
    isError: false,
  });
  return render(
    <MemoryRouter>
      <ShareTargetsSection params={params} />
    </MemoryRouter>,
  );
};

describe('доли в выручке с целью', () => {
  it('доля выше цели подсвечена и сказано, на сколько', () => {
    renderShares(
      { expenses: 42.5, payroll: 20, payrollConfigured: true },
      { expenseShare: 38, payrollShare: 25 },
    );

    const over = screen.getByText('dashboard.shares.over_target:4,5');
    expect(over.className).toMatch(/text-danger/);
    expect(screen.getByText('dashboard.shares.within_target')).toBeTruthy();
  });

  it('выручки нет — слова, а не процент от нуля', () => {
    const { container } = renderShares(
      { expenses: null, payroll: null, payrollConfigured: true },
      { expenseShare: 30, payrollShare: 20 },
    );

    expect(screen.getAllByText('dashboard.shares.no_revenue')).toHaveLength(2);
    expect(container.textContent).not.toMatch(/%/);
  });

  it('статья зарплаты не указана — подсказка со ссылкой на раздел', () => {
    renderShares(
      { expenses: 50, payroll: null, payrollConfigured: false },
      { expenseShare: null, payrollShare: null },
    );

    const hint = screen.getByRole('link', {
      name: 'dashboard.shares.payroll_not_configured',
    });
    expect(hint.getAttribute('href')).toBe('/payroll');
  });
});
