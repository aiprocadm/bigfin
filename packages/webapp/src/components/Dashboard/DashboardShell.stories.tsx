import type { Meta, StoryObj } from '@storybook/react';
import {
  BarChart3,
  Bell,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Sidebar } from '../ui/Sidebar';
import { Topbar } from '../ui/Topbar';
import { DashboardShell } from './DashboardShell';

const meta = {
  title: 'Dashboard/DashboardShell',
  component: DashboardShell,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sidebar: (
      <Sidebar
        items={[
          { href: '/', label: 'Дашборд', icon: LayoutDashboard },
          { href: '/contacts', label: 'Контрагенты', icon: Users },
          { href: '/accounts', label: 'Счета', icon: CreditCard },
          { href: '/financial-reports', label: 'Отчёты', icon: BarChart3 },
          { href: '/preferences', label: 'Настройки', icon: Settings },
        ]}
        activeHref="/"
      />
    ),
    topbar: (
      <Topbar
        searchSlot={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input placeholder="Поиск..." className="pl-9" />
          </div>
        }
        quickActionsSlot={
          <Button variant="ghost" size="icon" aria-label="Создать">
            <Plus className="h-4 w-4" />
          </Button>
        }
        helpSlot={
          <Button variant="ghost" size="icon" aria-label="Помощь">
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
        notificationsSlot={
          <Button variant="ghost" size="icon" aria-label="Уведомления">
            <Bell className="h-4 w-4" />
          </Button>
        }
        avatarSlot={
          <Avatar>
            <AvatarFallback>ИП</AvatarFallback>
          </Avatar>
        }
      />
    ),
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Здесь будет рендериться BlueprintJS-страница
        </h1>
        <p className="mt-2 text-text-secondary">
          В реальном app сюда попадает контент DashboardPrivatePages — старые
          таблицы, формы, виджеты. Phase 3 их не трогает.
        </p>
      </div>
    ),
  },
};
