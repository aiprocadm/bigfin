import type { Meta, StoryObj } from '@storybook/react';
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

import { Sidebar, type SidebarItemData } from './Sidebar';

const meta = {
  title: 'UI/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const DEMO_ITEMS: SidebarItemData[] = [
  { href: '/', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/contacts', label: 'Контрагенты', icon: Users },
  { href: '/accounts', label: 'Счета', icon: CreditCard },
  { href: '/financial-reports', label: 'Отчёты', icon: BarChart3 },
  { href: '/invoices', label: 'Документы', icon: FileText },
  { href: '/preferences', label: 'Настройки', icon: Settings },
];

export const Expanded: Story = {
  args: { items: DEMO_ITEMS, activeHref: '/' },
};

export const Mini: Story = {
  args: { items: DEMO_ITEMS, activeHref: '/', mini: true },
};

export const WithActiveDeep: Story = {
  args: { items: DEMO_ITEMS, activeHref: '/financial-reports' },
};
