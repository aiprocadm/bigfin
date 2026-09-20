import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, args?: Record<string, unknown>) =>
      args ? `${key}:${Object.values(args).join(',')}` : key,
    getInitOptions: () => ({ currentLocale: 'ru' }),
  },
}));

const useMoneySummary = vi.fn();
vi.mock('./useMoneySummary', () => ({
  useMoneySummary: () => useMoneySummary(),
}));

const usePaymentCalendar = vi.fn();
vi.mock('@/hooks/query/paymentCalendar', () => ({
  usePaymentCalendar: (...args: unknown[]) => usePaymentCalendar(...args),
}));

vi.mock('@/hooks/state', () => ({
  useFeatureCan: () => ({ featureCan: () => true }),
}));

import CashTimelineSection from './CashTimelineSection';

/**
 * РЕГРЕССИЯ ЭТАПА 16 ТЗ-2.
 *
 * Расчёт разрывов научился возвращать СПИСОК интервалов с глубиной ямы.
 * Вердикт главной при этом обязан остаться прежним — он отвечает на вопрос
 * «когда впервые не хватит», а не «сколько занять».
 *
 * Почему это отдельный сторож. Соблазн подставить в вердикт глубину ямы
 * велик: число крупнее и выглядит важнее. Но владелец прочтёт его как «столько
 * не хватит такого-то числа» — и приготовит деньги не к тому дню и не в той
 * сумме. Расхождение было бы тихим: экран остался бы красивым и связным.
 */
const summary = {
  cashBalance: { amount: 175000, formattedAmount: '175 000,00 ₽' },
  currencyCode: 'RUB',
};

/** Ответ сервера: одна яма с 5 июня по 9 июня, дно 9 июня на 300 000. */
const forecastWithGap = {
  days: [
    { date: '2026-06-04', balance: 50000 },
    { date: '2026-06-05', balance: -30000 },
    { date: '2026-06-09', balance: -300000 },
    { date: '2026-06-10', balance: 20000 },
  ],
  gap: { date: '2026-06-05', amount: 30000, daysFromStart: 1 },
  gaps: [
    {
      from: '2026-06-05',
      to: '2026-06-09',
      deepestAmount: 300000,
      deepestDate: '2026-06-09',
    },
  ],
};

/**
 * Пробелы в деньгах НЕРАЗРЫВНЫЕ (U+00A0), а в тексте проверки — обычные.
 * Без приведения проверка «не содержит 300 000» молча проходит при любом
 * числе, и сторож становится бумажным. Проверено мутацией.
 */
const plain = (text: string | null): string =>
  (text ?? '').replace(/[\s\u00a0\u202f]+/g, ' ');

const renderSection = (forecast: unknown) => {
  useMoneySummary.mockReturnValue({ data: summary, isLoading: false });
  usePaymentCalendar.mockReturnValue({ data: forecast, isLoading: false });

  return render(
    <MemoryRouter>
      <CashTimelineSection />
    </MemoryRouter>,
  );
};

describe('вердикт ленты денег после появления списка разрывов', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('называет ПЕРВЫЙ день ямы и нехватку ИМЕННО В ЭТОТ день', () => {
    renderSection(forecastWithGap);

    // Подделка `intl` склеивает ключ со значениями через запятую, поэтому в
    // тексте видно ровно то, что ушло в перевод.
    const verdict = plain(screen.getByText(/cash_timeline\.verdict_gap/).textContent);

    expect(verdict).toContain('5 июня');
    expect(verdict).toContain('30 000,00');
    // Глубина ямы в вердикт НЕ попадает — это ответ на другой вопрос.
    expect(verdict).not.toContain('300 000');
    expect(screen.queryByText(/verdict_ok/)).toBeNull();
  });

  it('без ям вердикт остаётся спокойным', () => {
    renderSection({
      days: [
        { date: '2026-06-04', balance: 50000 },
        { date: '2026-06-05', balance: 40000 },
      ],
      gap: null,
      gaps: [],
    });

    expect(screen.getByText(/cash_timeline\.verdict_ok/)).toBeTruthy();
    expect(screen.queryByText(/verdict_gap/)).toBeNull();
  });

  it('пустой список ям не считается разрывом', () => {
    // Защита от `Boolean([])`: пустой список в JavaScript истинен, и проверка
    // «есть ли разрыв» по нему покрасила бы спокойный прогноз в тревожный.
    renderSection({
      days: [{ date: '2026-06-04', balance: 50000 }],
      gap: null,
      gaps: [],
    });

    expect(screen.queryByText(/verdict_gap/)).toBeNull();
  });
});
