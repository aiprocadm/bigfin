import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) => key,
  },
}));

const useNotifications = vi.fn();
const markRead = vi.fn();
vi.mock('@/hooks/query/notifications', () => ({
  useNotifications: () => useNotifications(),
  useMarkNotificationRead: () => ({ mutate: markRead }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
}));

// Форматтер организации проверен своими тестами (карта v25) — здесь важно,
// что лента зовёт именно его, а не печатает сырую строку сервера.
vi.mock('@/utils/organizationDate', () => ({
  formatOrganizationDate: (date: Date) =>
    `дата:${date.toISOString().slice(0, 10)}`,
}));

import { NotificationsList } from './NotificationsList';

/**
 * У2 карты v27. У уведомления видна дата.
 *
 * В строках ленты были только заголовок и текст: не отличить сегодняшнее
 * предупреждение от двухнедельного. Дата печатается по формату организации.
 */
const rows = [
  {
    id: 1,
    eventType: 'overdue',
    title: 'Просроченные счета клиентов',
    body: 'Просрочено счетов: 2.',
    firedAt: '2026-08-26 07:00:00',
    read: false,
  },
  {
    id: 2,
    eventType: 'low_balance',
    title: 'Остаток на счёте ниже минимума',
    body: 'Ниже порога.',
    firedAt: '2026-08-12 07:00:00',
    read: true,
  },
];

const renderList = () => {
  useNotifications.mockReturnValue({ data: rows });
  return render(
    <MemoryRouter>
      <NotificationsList />
      <Route
        render={({ location }) => (
          <div data-testid="loc">{location.pathname}</div>
        )}
      />
    </MemoryRouter>,
  );
};

describe('дата в строке ленты', () => {
  it('каждая строка подписана датой срабатывания по формату организации', () => {
    renderList();

    expect(screen.getByText('дата:2026-08-26')).toBeTruthy();
    expect(screen.getByText('дата:2026-08-12')).toBeTruthy();
  });
});

/**
 * У3 карты v27. Клик по уведомлению ведёт к предмету.
 *
 * Раньше клик лишь гасил точку непрочитанности: «Просрочено счетов: 2» —
 * а к самим счетам человек должен был идти сам. У каждого события есть
 * очевидный адрес; неизвестное событие ведёт себя по-старому.
 */
describe('клик по уведомлению', () => {
  it('ведёт в раздел события и помечает прочитанным', () => {
    renderList();

    fireEvent.click(screen.getByText('Просроченные счета клиентов'));

    expect(markRead).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('loc').textContent).toBe('/invoices');
  });

  it('остаток ниже минимума ведёт к кассам и счетам', () => {
    renderList();

    fireEvent.click(screen.getByText('Остаток на счёте ниже минимума'));

    expect(screen.getByTestId('loc').textContent).toBe('/cashflow-accounts');
  });

  it('неизвестное событие только помечается прочитанным', () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 3,
          eventType: 'mail_failed',
          title: 'Письмо не отправлено',
          body: 'Причина: таймаут.',
          firedAt: '2026-08-26 07:00:00',
          read: false,
        },
      ],
    });
    render(
      <MemoryRouter>
        <NotificationsList />
        <Route
          render={({ location }) => (
            <div data-testid="loc">{location.pathname}</div>
          )}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Письмо не отправлено'));

    expect(markRead).toHaveBeenCalledWith(3);
    expect(screen.getByTestId('loc').textContent).toBe('/');
  });
});
