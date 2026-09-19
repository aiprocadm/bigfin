import type { Meta, StoryObj } from '@storybook/react';
import { BarChart3, Home, Menu, Plus, Receipt } from 'lucide-react';

import { BottomNav } from './BottomNav';

/**
 * Нижняя панель — навигация на телефоне: четыре ежедневных дела и вход
 * в остальное.
 */
const meta: Meta<typeof BottomNav> = {
  title: 'Bigfin/Нижняя панель',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const НаТелефоне: Story = {
  args: {
    ariaLabel: 'Быстрые разделы',
    activeHref: '/cashflow-accounts/transactions',
    items: [
      { key: 'home', label: 'Главная', icon: Home, href: '/' },
      {
        key: 'ops',
        label: 'Операции',
        icon: Receipt,
        href: '/cashflow-accounts/transactions',
      },
      { key: 'add', label: 'Добавить', icon: Plus, emphasis: true },
      { key: 'reports', label: 'Отчёты', icon: BarChart3, href: '/reports' },
      { key: 'more', label: 'Ещё', icon: Menu },
    ],
  },
  render: (args) => (
    // Панель прижата к низу окна, поэтому истории нужна высота.
    <div className="bigfin-ui relative h-[320px] bg-background">
      <div className="p-4 text-sm text-text-secondary">
        Содержимое страницы
      </div>
      <BottomNav {...args} className="!absolute !md:flex" />
    </div>
  ),
};
