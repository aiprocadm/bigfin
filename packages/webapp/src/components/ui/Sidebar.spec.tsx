import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BarChart3, House } from 'lucide-react';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      ({
        'sidebar.aria_label': 'Разделы',
        'sidebar.collapse': 'Свернуть меню',
        'sidebar.expand': 'Развернуть меню',
      })[key] ?? key,
  },
}));

import { Sidebar, type SidebarGroupData } from './Sidebar';

/** Боковое меню этапа 45 ТЗ-4 (UI-045-3). */
const groups: SidebarGroupData[] = [
  { items: [{ href: '/', label: 'Главная', labelText: 'Главная', icon: House }] },
  {
    title: 'Отчёты',
    titleText: 'Отчёты',
    icon: BarChart3,
    items: [
      { href: '/financial-reports', label: 'Все отчёты' },
      { href: '/financial-reports/balance-sheet', label: 'Баланс' },
    ],
  },
];

describe('боковое меню', () => {
  it('текущий пункт помечен жёлтой точкой, и она одна', () => {
    const { container } = render(<Sidebar groups={groups} activeHref="/financial-reports/balance-sheet" />);

    expect(screen.getByRole('link', { name: 'Баланс' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelectorAll('.bg-accent')).toHaveLength(1);
  });

  it('свёрнутый раздел не пускает Tab в невидимые пункты', () => {
    render(<Sidebar groups={groups} activeHref="/" />);
    const header = screen.getByRole('button', { name: 'Отчёты' });

    // На главной первый раздел открыт по умолчанию — одно нажатие закрывает.
    expect(header).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    const hidden = screen.getByText('Баланс').closest('[inert]');
    expect(hidden).not.toBeNull();
  });

  it('свёрнутое меню — значки групп с подписями; кнопка сворачивания работает', () => {
    const onToggleMini = vi.fn();
    render(<Sidebar groups={groups} activeHref="/" mini onToggleMini={onToggleMini} />);

    expect(screen.getByRole('button', { name: 'Отчёты' })).toHaveAttribute('title', 'Отчёты');
    expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute('title', 'Главная');
    // Подписей пунктов в свёрнутом меню нет — только значки.
    expect(screen.queryByText('Все отчёты')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Развернуть меню' }));
    expect(onToggleMini).toHaveBeenCalledTimes(1);
  });

  it('без обработчика кнопки сворачивания нет (экраны настроек)', () => {
    render(<Sidebar groups={groups} activeHref="/" mini />);
    expect(screen.queryByRole('button', { name: 'Развернуть меню' })).toBeNull();
  });
});
