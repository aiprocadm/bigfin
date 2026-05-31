import type { Meta, StoryObj } from '@storybook/react';
import { Bell, HelpCircle, Plus, Search } from 'lucide-react';

import { Avatar, AvatarFallback } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Topbar } from './Topbar';

const meta = {
  title: 'UI/Topbar',
  component: Topbar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IconButton = ({
  icon: Icon,
  label,
  badge,
}: {
  icon: typeof Bell;
  label: string;
  badge?: string;
}) => (
  <Button variant="ghost" size="icon" aria-label={label} className="relative">
    <Icon className="h-4 w-4" />
    {badge && (
      <Badge
        variant="destructive"
        className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
      >
        {badge}
      </Badge>
    )}
  </Button>
);

export const Full: Story = {
  args: {
    searchSlot: (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input placeholder="Поиск по контрагентам, счетам..." className="pl-9" />
      </div>
    ),
    quickActionsSlot: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Быстрое создание">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Создать счёт</DropdownMenuItem>
          <DropdownMenuItem>Создать контрагента</DropdownMenuItem>
          <DropdownMenuItem>Создать сделку</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    helpSlot: <IconButton icon={HelpCircle} label="Помощь" />,
    notificationsSlot: <IconButton icon={Bell} label="Уведомления" badge="3" />,
    orgSwitcherSlot: (
      <Button variant="secondary" size="sm">
        ООО «Ромашка»
      </Button>
    ),
    avatarSlot: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-2 outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full">
            <Avatar>
              <AvatarFallback>ИП</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Профиль</DropdownMenuItem>
          <DropdownMenuItem>Настройки</DropdownMenuItem>
          <DropdownMenuItem>Выйти</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
};

export const MinimalNoSearch: Story = {
  args: {
    notificationsSlot: <IconButton icon={Bell} label="Уведомления" />,
    avatarSlot: (
      <Avatar>
        <AvatarFallback>ИП</AvatarFallback>
      </Avatar>
    ),
  },
};
