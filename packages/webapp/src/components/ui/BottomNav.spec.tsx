import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home, Plus, Receipt } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { BottomNav, BottomNavItem } from './BottomNav';

/**
 * Правила нижней панели телефона.
 *
 * Панель — это быстрые руки, а не меню. Всё, что здесь стережётся, про одно:
 * пять целей в ряд должны надёжно различаться пальцем и словами.
 */
const items: BottomNavItem[] = [
  { key: 'home', label: 'Главная', icon: Home, href: '/' },
  { key: 'ops', label: 'Операции', icon: Receipt, href: '/ops' },
  { key: 'add', label: 'Добавить', icon: Plus, emphasis: true, onClick: vi.fn() },
];

const renderNav = (props: Partial<React.ComponentProps<typeof BottomNav>> = {}) =>
  render(
    <BottomNav items={items} ariaLabel="Быстрые разделы" {...props} />,
  );

describe('BottomNav', () => {
  it('у каждой кнопки есть СЛОВО, а не только значок', () => {
    // Значок без подписи — загадка: «конверт» это письма или уведомления?
    // На телефоне гадать особенно дорого, там нет всплывающей подсказки.
    renderNav();

    items.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it('у панели есть название для чтения с экрана', () => {
    renderNav();

    expect(
      screen.getByRole('navigation', { name: 'Быстрые разделы' }),
    ).toBeInTheDocument();
  });

  it('текущий раздел отмечен', () => {
    renderNav({ activeHref: '/ops' });

    expect(screen.getByRole('button', { name: /Операции/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('только текущий раздел отмечен', () => {
    renderNav({ activeHref: '/ops' });

    expect(screen.getByRole('button', { name: /Главная/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('переход зовёт навигацию, а не действие', async () => {
    const onNavigate = vi.fn();
    renderNav({ onNavigate });

    await userEvent.click(screen.getByRole('button', { name: /Главная/ }));

    expect(onNavigate).toHaveBeenCalledWith('/');
  });

  it('действие зовёт себя, а не навигацию', async () => {
    const onNavigate = vi.fn();
    const onClick = vi.fn();
    renderNav({
      onNavigate,
      items: [{ key: 'add', label: 'Добавить', icon: Plus, onClick }],
    });

    await userEvent.click(screen.getByRole('button', { name: /Добавить/ }));

    expect(onClick).toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('кнопки не ниже 56 точек', () => {
    // Палец накрывает около сантиметра, а целей в ряду пять. Ниже — промахи.
    renderNav();

    expect(screen.getByRole('button', { name: /Главная/ })).toHaveClass(
      'min-h-14',
    );
  });

  it('панель скрыта на большом экране', () => {
    // Там боковое меню и удобнее, и вмещает всё; две навигации разом только
    // сбивают с толку.
    renderNav();

    expect(screen.getByRole('navigation')).toHaveClass('md:hidden');
  });

  it('учитывается полоса жеста внизу телефона', () => {
    // Без этого отступа нижний ряд попадает под системную полосу и
    // перестаёт нажиматься — на части телефонов панель просто «не работает».
    renderNav();

    expect(screen.getByRole('navigation').className).toContain(
      'safe-area-inset-bottom',
    );
  });
});
