import { ArrowDownLeft, ArrowUpRight, Plus, Search } from 'lucide-react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { OPEN_SEARCH } from '@/store/types';
import { DialogsName } from '@/constants/dialogs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Topbar } from '@/components/ui/Topbar';
import ConnectedMoneyWidget from './ConnectedMoneyWidget';
import { OnboardingProgress } from './Onboarding/OnboardingProgress';
import { useAuthActions, useDialogActions } from '@/hooks/state';
import { useAuthenticatedAccount } from '@/hooks/query';
import { firstLettersArgs } from '@/utils';
import { NotificationBell } from '@/containers/Notifications/InApp/NotificationBell';
import { useGetUniversalSearchTypeOptions } from '@/containers/UniversalSearch/utils';
import { searchScopeLabel } from '@/containers/UniversalSearch/searchScope';

export const ConnectedTopbar = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { setLogout } = useAuthActions();
  const { openDialog } = useDialogActions();
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
          <h1 className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-text-primary">
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
      notificationsSlot={
        <>
          {/* Онбординг «N из M» (FT-095 ТЗ-3) — рядом с колокольчиком: оба
              про «что меня ждёт», и оба видны на телефоне. Сам решает,
              показываться ли: только владельцу и пока есть что делать. */}
          <OnboardingProgress />
          <NotificationBell />
        </>
      }
      moneySlot={<ConnectedMoneyWidget />}
      quickActionsSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Подпись видна на обычных экранах: главное действие панели не
                должно быть загадкой из одного значка. На телефоне остаётся
                только значок — там дорога каждая точка ширины. */}
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {intl.get('topbar.add')}
              </span>
              <span className="sr-only sm:hidden">
                {intl.get('topbar.add')}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {/* ЕЖЕДНЕВНОЕ — СВЕРХУ. Владелец заходит в продукт учёта денег
                чаще всего затем, чтобы записать движение денег, а не чтобы
                выставить счёт: счета выставляют раз в неделю, деньги ходят
                каждый день. Прежний список начинался со счетов. */}
            <DropdownMenuLabel>{intl.get('topbar.add.money')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openDialog(DialogsName.MoneyInForm)}>
              <ArrowDownLeft className="mr-2 h-4 w-4 text-success" aria-hidden />
              {intl.get('banking.label.add_money_in')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDialog(DialogsName.MoneyOutForm)}
            >
              <ArrowUpRight className="mr-2 h-4 w-4 text-text-secondary" aria-hidden />
              {intl.get('banking.label.add_money_out')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {intl.get('topbar.add.documents')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => history.push('/invoices/new')}>
              {intl.get('topbar.add.invoice')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => history.push('/bills/new')}>
              {intl.get('topbar.add.bill')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => history.push('/customers/new')}>
              {intl.get('topbar.add.contact')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      avatarSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={intl.get('topbar.profile_menu')}
              className="ml-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => history.push('/preferences')}>
              {intl.get('preferences')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLogout()}>
              {intl.get('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
};
