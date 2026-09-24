import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import OverviewSection from './OverviewSection';
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
 * FT-061 ТЗ-3. ПРИ НУЛЕВОЙ БАЗЕ НИ ОДИН ПОКАЗАТЕЛЬ НЕ ПОКАЗЫВАЕТ ПРОЦЕНТ.
 *
 * Сервер присылает `changePercent: null`, когда за базу данных нет. Раньше
 * подпись под плиткой просто пропадала — и было непонятно, сравнения нет
 * или оно сломалось. У Финтабло на этом месте «+100 %» (W1). Здесь —
 * слова «нет базы для сравнения» и ни одного знака процента.
 */
const params: OverviewParams = {
  period: { kind: 'month', fromDate: '2026-09-01', toDate: '2026-09-30' },
  choosePeriod: vi.fn(),
  compare: { kind: 'previous' },
  chooseCompare: vi.fn(),
  directionsSortBy: 'profit',
  setDirectionsSortBy: vi.fn(),
};

const tile = (amount: number, changePercent: number | null) => ({
  amount,
  formattedAmount: `${amount} ₽`,
  previousAmount: 0,
  changePercent,
});

const overview = (changePercent: number | null) => ({
  period: { fromDate: '2026-09-01', toDate: '2026-09-30' },
  comparison: { kind: 'previous', fromDate: '2026-08-02', toDate: '2026-08-31' },
  tiles: {
    cashBalance: { amount: 0, formattedAmount: '0 ₽' },
    income: tile(120000, changePercent),
    expenses: tile(80000, changePercent),
    netProfit: { ...tile(40000, changePercent), marginPercent: null },
  },
  months: [],
  accounts: [],
  // Доли статей — это не сравнение с базой, и в этой проверке их нет,
  // чтобы знак процента в них не маскировал настоящую ошибку.
  topExpenses: [],
  attention: [],
  topContractors: { rows: [], totalRevenue: 0, concentrationCount: null, verdict: null },
  directionsProfit: { rows: [], unassigned: null, sortBy: 'profit' },
  plan: null,
  currencyCode: 'RUB',
});

const renderSection = (changePercent: number | null) => {
  useDashboardOverview.mockReturnValue({
    data: overview(changePercent),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <OverviewSection params={params} />
    </MemoryRouter>,
  );
};

describe('сравнение периодов на главной', () => {
  it('нулевая база: у каждой плитки «нет базы», процентов нет вовсе', () => {
    const { container } = renderSection(null);

    expect(screen.getAllByText('dashboard.compare.no_base')).toHaveLength(3);
    expect(container.textContent).not.toMatch(/%/);
  });

  it('есть база: процент со знаком, «нет базы» не пишется', () => {
    renderSection(12.5);

    expect(screen.getAllByText('+12.5%')).toHaveLength(3);
    expect(screen.queryByText('dashboard.compare.no_base')).toBeNull();
  });

  it('под плитками написано, с чем сравнили', () => {
    renderSection(5);

    expect(screen.getByText('dashboard.compare.base:02.08–31.08')).toBeTruthy();
  });

  it('база сравнения входит в запрос', () => {
    renderSection(5);

    expect(useDashboardOverview).toHaveBeenCalledWith(
      params.period,
      'profit',
      { kind: 'previous' },
    );
  });
});
