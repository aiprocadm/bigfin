// @ts-nocheck — хуки в @/hooks/state и @/hooks/query не типизированы
import { Bell, HelpCircle, Plus, Search } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { OPEN_SEARCH } from '@/store/types';
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
  const dispatch = useDispatch();
  const { setLogout } = useAuthActions();
  const { data: user } = useAuthenticatedAccount();

  // Открыть оверлей универсального поиска (как по горячей клавише «/»).
  const openSearch = () => dispatch({ type: OPEN_SEARCH });

  const initials = user
    ? firstLettersArgs(user.first_name, user.last_name)
    : '??';

  return (
    <Topbar
      searchSlot={
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          {/* Поле-триггер: открывает оверлей универсального поиска. */}
          <Input
            readOnly
            placeholder="Поиск по контрагентам, счетам..."
            className="cursor-pointer pl-9"
            onClick={openSearch}
            onFocus={openSearch}
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
            <DropdownMenuItem onClick={() => history.push('/invoices/new')}>
              Счёт покупателю
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => history.push('/bills/new')}>
              Счёт поставщика
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => history.push('/customers/new')}>
              Контрагента
            </DropdownMenuItem>
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
