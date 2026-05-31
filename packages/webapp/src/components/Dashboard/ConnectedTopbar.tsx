// @ts-nocheck — хуки в @/hooks/state и @/hooks/query не типизированы
import { Bell, HelpCircle, Plus, Search } from 'lucide-react';
import { useHistory } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Topbar } from '@/components/ui/Topbar';
import { useAuthActions } from '@/hooks/state';
import { useAuthenticatedAccount } from '@/hooks/query';
import { firstLettersArgs } from '@/utils';

export const ConnectedTopbar = () => {
  const history = useHistory();
  const { setLogout } = useAuthActions();
  const { data: user } = useAuthenticatedAccount();

  const initials = user
    ? firstLettersArgs(user.first_name, user.last_name)
    : '??';

  return (
    <Topbar
      searchSlot={
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Поиск по контрагентам, счетам..."
            className="pl-9"
          />
        </div>
      }
      quickActionsSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Быстрое создание">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* TODO Phase 4: подключить к реальным dialog actions */}
            <DropdownMenuItem disabled>Создать счёт (TBD)</DropdownMenuItem>
            <DropdownMenuItem disabled>
              Создать контрагента (TBD)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Создать сделку (TBD)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Меню профиля"
              className="ml-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => history.push('/preferences')}>
              Настройки
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLogout()}>
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
};
