import { Plus, Search } from 'lucide-react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

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
import { NotificationBell } from '@/containers/Notifications/InApp/NotificationBell';
import { useGetUniversalSearchTypeOptions } from '@/containers/UniversalSearch/utils';
import { searchScopeLabel } from '@/containers/UniversalSearch/searchScope';

export const ConnectedTopbar = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { setLogout } = useAuthActions();
  const { data: user } = useAuthenticatedAccount();

  // Открыть оверлей универсального поиска (как по горячей клавише «/»).
  const openSearch = () => dispatch({ type: OPEN_SEARCH });

  // Заголовок текущей страницы (вернули в панель после удаления старой).
  const pageTitle = useSelector((state) => state.dashboard?.pageTitle);

  // С3 карты v39: подпись поиска называет ТОТ вид записей, среди которого
  // поиск и правда будет искать. Прежняя подпись обещала «по контрагентам,
  // счетам…», а поиск смотрит один вид за раз — и «ничего не найдено»
  // читалось как «такого нет в продукте».
  const searchTypeOptions = useGetUniversalSearchTypeOptions();
  const searchResourceType = useSelector(
    (state) => state.globalSearch?.defaultResourceType,
  );
  const searchScope = searchScopeLabel(searchTypeOptions, searchResourceType);

  const initials = user
    ? firstLettersArgs(user.first_name, user.last_name)
    : '??';

  return (
    <Topbar
      titleSlot={
        pageTitle ? (
          <h1 className="truncate text-sm font-medium text-text-primary">
            {pageTitle}
          </h1>
        ) : null
      }
      searchSlot={
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          {/* Поле-триггер: открывает оверлей универсального поиска. */}
          <Input
            readOnly
            placeholder={
              searchScope
                ? intl.get('universal_search.placeholder_in', {
                    resource: searchScope.toLowerCase(),
                  })
                : intl.get('search')
            }
            className="cursor-pointer pl-9"
            onClick={openSearch}
            onFocus={openSearch}
          />
        </div>
      }
      notificationsSlot={<NotificationBell />}
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
      avatarSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Меню профиля"
              className="ml-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-action"
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
