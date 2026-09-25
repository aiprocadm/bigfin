import { Plus, Search } from 'lucide-react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { OPEN_SEARCH } from '@/store/types';
import { cn } from '@/lib/cn';
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
import { Topbar } from '@/components/ui/Topbar';
import { usePageTitleState } from '@/components/ui/page-title';
import ConnectedMoneyWidget from './ConnectedMoneyWidget';
import { OnboardingProgress } from './Onboarding/OnboardingProgress';
import { useAuthActions } from '@/hooks/state';
import { useAuthenticatedAccount } from '@/hooks/query';
import { firstLettersArgs } from '@/utils';
import { NotificationBell } from '@/containers/Notifications/InApp/NotificationBell';
import { useAddActions } from './addActions';

/** ⌘K на Mac, Ctrl+K на остальных — подсказка на поле поиска. */
const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

export const ConnectedTopbar = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { setLogout } = useAuthActions();
  const { data: user } = useAuthenticatedAccount();
  const addActions = useAddActions();

  // Открыть командную строку (как по ⌘K / Ctrl+K и клавише «/»).
  const openSearch = () => dispatch({ type: OPEN_SEARCH });

  // Заголовок страницы в шапке — ТОЛЬКО когда крупный заголовок в теле ушёл
  // за край при прокрутке (R10, UI-045-1). Пока он виден, шапка пуста:
  // раньше здесь всегда стояла подпись маршрута, и заголовок читался дважды.
  const { collapsed: pageTitle } = usePageTitleState();

  // Подпись поиска — «Поиск и команды» (UI-042-5 → UI-045-4). Прежде она
  // честно называла один вид записей («Поиск: клиенты»), потому что старый
  // поиск искал по одному виду за раз. Командная строка ищет по всем видам
  // сразу — и подпись наконец может это обещать.
  const shortcut = isMac() ? '⌘K' : 'Ctrl K';

  const initials = user
    ? firstLettersArgs(user.first_name, user.last_name)
    : '??';

  return (
    <Topbar
      titleSlot={
        // Не h1: заголовок страницы — в теле; здесь его «переехавшая» копия.
        <span
          aria-hidden
          className={cn(
            'block max-w-xs truncate text-headline text-text-primary transition-opacity duration-200 ease-standard',
            pageTitle ? 'opacity-100' : 'opacity-0',
          )}
        >
          {pageTitle}
        </span>
      }
      searchSlot={
        <>
          {/* На телефоне поле поиска сжималось до 16 точек и ложилось поверх
              суммы денег, пряча её первую цифру (UI-042-1 ТЗ-4). Там —
              значок-лупа, открывающая тот же поиск. */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label={intl.get('search')}
            onClick={openSearch}
          >
            <Search className="h-5 w-5" aria-hidden />
          </Button>
          {/* Поле-кнопка: открывает командную строку. Не поле ввода — набирать
              здесь нечего, набирают в самой командной строке. */}
          <button
            type="button"
            onClick={openSearch}
            aria-label={intl.get('topbar.search_commands')}
            aria-keyshortcuts="Meta+K Control+K"
            className="hidden h-9 w-full min-w-0 items-center gap-2 rounded-control border-0 bg-fill-1 px-3 text-left text-body text-text-muted transition-colors hover:bg-fill-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action sm:flex"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {intl.get('topbar.search_commands')}
            </span>
            <kbd className="hidden shrink-0 rounded-control bg-surface px-1.5 font-sans text-footnote text-text-muted md:inline">
              {shortcut}
            </kbd>
          </button>
        </>
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
            {/* На телефоне кнопки нет: там «＋ Добавить» — в середине
                нижней панели, под большим пальцем, с тем же списком. Две
                одинаковые кнопки на экране в 390 точек отнимали место у
                суммы денег. */}
            <Button variant="primary" size="sm" className="hidden gap-1.5 sm:inline-flex">
              <Plus className="h-4 w-4" aria-hidden />
              {intl.get('topbar.add')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {/* ЕЖЕДНЕВНОЕ — СВЕРХУ. Владелец заходит в продукт учёта денег
                чаще всего затем, чтобы записать движение денег, а не чтобы
                выставить счёт: счета выставляют раз в неделю, деньги ходят
                каждый день. Прежний список начинался со счетов. */}
            <DropdownMenuLabel>{intl.get('topbar.add.money')}</DropdownMenuLabel>
            {addActions
              .filter((action) => action.kind === 'money')
              .map((action) => (
                <AddMenuItem key={action.id} action={action} />
              ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {intl.get('topbar.add.documents')}
            </DropdownMenuLabel>
            {addActions
              .filter((action) => action.kind === 'documents')
              .map((action) => (
                <AddMenuItem key={action.id} action={action} />
              ))}
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

/** Пункт меню «＋ Добавить» — из общего списка действий. */
function AddMenuItem({ action }: { action: ReturnType<typeof useAddActions>[number] }) {
  const Icon = action.icon;
  return (
    <DropdownMenuItem onClick={action.run}>
      <Icon
        className={cn('mr-2 h-4 w-4', action.positive ? 'text-success' : 'text-text-secondary')}
        aria-hidden
      />
      {action.label}
    </DropdownMenuItem>
  );
}
