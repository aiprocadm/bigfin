import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import PlanProgressSection from './PlanProgressSection';
import { DirectionsPlanTable } from './DirectionsPlanTable';
import type { OverviewParams } from './useOverviewParams';

// Подделки ниже vitest поднимает над ввозами сам: порядок записи не важен.

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, args?: Record<string, unknown>) =>
      args ? `${key}:${Object.values(args).join(',')}` : key,
    getInitOptions: () => ({ currentLocale: 'ru' }),
  },
}));

vi.mock('@/utils/organizationMoney', () => ({
  formatOrganizationMoney: (value: number) => `${value} ₽`,
}));

const useDashboardOverview = vi.fn();
vi.mock('./useDashboardOverview', () => ({
  useDashboardOverview: (...args: unknown[]) => useDashboardOverview(...args),
}));

/**
 * Блок «План» на главной (FT-060, FT-063 ТЗ-3).
 */
const params: OverviewParams = {
  period: { kind: 'month', fromDate: '2026-08-01', toDate: '2026-08-31' },
  choosePeriod: vi.fn(),
  compare: { kind: 'previous' },
  chooseCompare: vi.fn(),
  directionsSortBy: 'profit',
  setDirectionsSortBy: vi.fn(),
};

const progress = (completionPercent: number | null) => ({
  periodPlan: 750000,
  // 21-е число 31-дневного месяца: 750 000 × 21 / 31 (приёмка FT-060).
  proratedPlan: 508064.52,
  elapsedDays: 21,
  totalDays: 31,
  fact: 400000,
  completionPercent,
});

const renderPlan = (plan: unknown) => {
  useDashboardOverview.mockReturnValue({
    data: { period: { fromDate: '2026-08-01', toDate: '2026-08-31' }, plan },
    isLoading: false,
    isError: false,
  });
  return render(
    <MemoryRouter>
      <PlanProgressSection params={params} />
    </MemoryRouter>,
  );
};

const basePlan = {
  budget: { id: 1, name: 'Бюджет 2026' },
  income: progress(78.7),
  expenses: null,
  cumulative: [],
  directions: null,
  shares: { expenses: null, payroll: null, payrollConfigured: false },
};

describe('блок «План»', () => {
  it('показывает план периода, план по сегодня и факт', () => {
    renderPlan(basePlan);

    expect(screen.getByText('750000 ₽')).toBeTruthy();
    expect(screen.getByText('508064.52 ₽')).toBeTruthy();
    expect(screen.getByText('400000 ₽')).toBeTruthy();
    expect(screen.getByText('dashboard.plan.completion:78,7')).toBeTruthy();
  });

  it('без плана на прошедшие дни процента выполнения нет', () => {
    const { container } = renderPlan({ ...basePlan, income: progress(null) });

    expect(screen.queryByText(/dashboard\.plan\.completion/)).toBeNull();
    expect(container.textContent).not.toMatch(/%/);
  });

  it('без бюджета — подсказка и ссылка на бюджеты', () => {
    renderPlan({ ...basePlan, budget: null, income: null });

    expect(screen.getByText(/dashboard\.plan\.no_budget/)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'dashboard.plan.open_budgets' })
        .getAttribute('href'),
    ).toBe('/budgets');
  });

  it('план не посчитался — блока нет', () => {
    const { container } = renderPlan(null);

    expect(container.textContent).toBe('');
  });
});

describe('поступления по направлениям', () => {
  it('строка без направления подписана, процент без плана — прочерк', () => {
    render(
      <DirectionsPlanTable
        rows={[
          {
            projectId: 7,
            name: 'Опт',
            plan: 100000,
            fact: 90000,
            deviation: -10000,
            completionPercent: 90,
          },
          {
            projectId: null,
            name: null,
            plan: 0,
            fact: 5000,
            deviation: 5000,
            completionPercent: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Опт')).toBeTruthy();
    expect(screen.getByText('90 %')).toBeTruthy();
    expect(screen.getByText('dashboard.plan.directions.unassigned')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('направлений нет — таблицы нет', () => {
    expect(render(<DirectionsPlanTable rows={[]} />).container.textContent).toBe('');
    expect(render(<DirectionsPlanTable rows={null} />).container.textContent).toBe('');
  });
});
