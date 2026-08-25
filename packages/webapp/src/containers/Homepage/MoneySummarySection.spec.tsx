import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, args?: Record<string, unknown>) =>
      args ? `${key}:${Object.values(args).join(',')}` : key,
  },
}));

const useMoneySummary = vi.fn();
vi.mock('./useMoneySummary', () => ({
  useMoneySummary: () => useMoneySummary(),
}));

import MoneySummarySection from './MoneySummarySection';

/**
 * Г2 карты v20: главная должна отвечать на вопрос «как дела с деньгами».
 * Блок ведёт в те же разделы, где эти суммы можно разобрать построчно.
 */
const summary = {
  cashBalance: { amount: 175000, formattedAmount: '175 000,00 ₽' },
  receivable: { amount: 53000, formattedAmount: '53 000,00 ₽' },
  receivableOverdue: { amount: 35000, formattedAmount: '35 000,00 ₽' },
  payable: { amount: 12000, formattedAmount: '12 000,00 ₽' },
  payableOverdue: { amount: 0, formattedAmount: '0,00 ₽' },
  currencyCode: 'RUB',
};

const renderSection = (state: any) => {
  useMoneySummary.mockReturnValue(state);
  return render(
    <MemoryRouter>
      <MoneySummarySection />
    </MemoryRouter>,
  );
};

describe('сводка о деньгах на главной', () => {
  it('показывает остатки и оба долга', () => {
    renderSection({ data: summary, isLoading: false, isError: false });

    expect(screen.getByText('175 000,00 ₽')).toBeTruthy();
    expect(screen.getByText('53 000,00 ₽')).toBeTruthy();
    expect(screen.getByText('12 000,00 ₽')).toBeTruthy();
  });

  it('просроченную часть показывает только когда она есть', () => {
    renderSection({ data: summary, isLoading: false, isError: false });

    // У долга нам просрочено 35 000 — подпись есть.
    expect(
      screen.getByText('homepage.money.overdue_of_it:35 000,00 ₽'),
    ).toBeTruthy();
    // У нашего долга просрочки нет — второй подписи быть не должно.
    expect(
      screen.queryByText('homepage.money.overdue_of_it:0,00 ₽'),
    ).toBeNull();
  });

  it('каждая плитка ведёт в свой раздел', () => {
    renderSection({ data: summary, isLoading: false, isError: false });

    const links = screen
      .getAllByRole('link')
      .map((anchor: HTMLElement) => anchor.getAttribute('href'));
    expect(links).toEqual(['/cashflow-accounts', '/invoices', '/bills']);
  });

  it('пока грузится — блок не мигает пустыми плитками', () => {
    const { container } = renderSection({ isLoading: true, isError: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('сводка недоступна — главная работает без блока, а не падает', () => {
    const { container } = renderSection({ isLoading: false, isError: true });

    expect(container).toBeEmptyDOMElement();
  });
});
