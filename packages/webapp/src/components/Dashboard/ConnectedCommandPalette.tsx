import * as React from 'react';
import intl from 'react-intl-universal';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { CornerDownRight } from 'lucide-react';

import {
  CommandPalette,
  useCommandPaletteShortcut,
} from '@/components/ui/command-palette';
import type { CommandItem, CommandSource } from '@/components/ui/command-search';
import { CLOSE_SEARCH, OPEN_SEARCH } from '@/store/types';
import { universalSearchSetSelectedItem } from '@/store/search/search.actions';
import useApiRequest from '@/hooks/useRequest';
import { useAbilitiesFilter, useAbilityContext } from '@/hooks/utils/useAbilityContext';
import { permissionAllows } from './permissionAllows';
import { AbilitySubject, CashflowAction } from '@/constants/abilityOption';
import {
  getResourceUrlFromType,
  transformResourceData,
} from '@/hooks/query/GenericResource';
import { getUniversalSearchBinds } from '@/containers/UniversalSearch/utils';
import { normalizeApiPath } from '@/utils';
import { useAddActions } from './addActions';
import { useNavGroups, menuTextString } from './ConnectedSidebar';
import {
  parseAmountQuery,
  registryAmountLink,
  registryRowToCommand,
} from './commandPaletteSources';

/** Сколько записей одного вида показывать: это подсказка, а не список. */
const PER_SOURCE = 5;

/**
 * Командная строка, подключённая к продукту (UI-045-4 ТЗ-4, R11).
 *
 * Заменяет старое окно поиска `UniversalSearch`: то искало один вид записей
 * за раз, и «ничего не найдено» на экране счетов при имени клиента читалось
 * как «такого клиента нет». Здесь одна строка ищет сразу всё:
 *
 * - «Действия» — то же, что «＋ Добавить» в шапке;
 * - «Перейти» — все пункты меню, с учётом модулей, прав и режима;
 * - записи всех видов, которые умел старый поиск (контрагенты, счета,
 *   документы, статьи учёта…), — по праву человека на каждый вид;
 * - «Операции» — если набрана сумма: «500 000» находит операции ровно на
 *   эту сумму.
 *
 * ОТКРЫВАЕТСЯ ТЕМ ЖЕ, ЧЕМ СТАРЫЙ ПОИСК: состояние «поиск открыт» общее
 * (`globalSearch.isOpen`), поэтому прежние клавиши «/» и Shift+P и поле в
 * шапке открывают уже её. Плюс ⌘K / Ctrl+K.
 *
 * НАЙДЕННАЯ ЗАПИСЬ ОТКРЫВАЕТСЯ ПРЕЖНИМ ПУТЁМ: выбор кладётся в то же общее
 * состояние, и карточку открывает тот же обработчик вида, что открывал её
 * из старого поиска (`DashboardUniversalSearchItemActions`). Двух способов
 * открыть счёт покупателя не появляется.
 */
export function ConnectedCommandPalette() {
  const dispatch = useDispatch();
  const history = useHistory();
  const apiRequest = useApiRequest();
  const ability = useAbilityContext();
  const abilityFilter = useAbilitiesFilter();
  const addActions = useAddActions();
  const navGroups = useNavGroups();

  const open = useSelector((state: any) => !!state.globalSearch?.isOpen);
  const setOpen = React.useCallback(
    (next: boolean) => dispatch({ type: next ? OPEN_SEARCH : CLOSE_SEARCH }),
    [dispatch],
  );
  const openPalette = React.useCallback(() => setOpen(true), [setOpen]);
  useCommandPaletteShortcut(openPalette);

  const items = React.useMemo<CommandItem[]>(() => {
    const actionsGroup = intl.get('command_palette.group.actions');
    const goGroup = intl.get('command_palette.group.go');

    const actions: CommandItem[] = addActions.map((action) => {
      const Icon = action.icon;
      return {
        id: `action-${action.id}`,
        group: actionsGroup,
        title: action.label,
        keywords: action.keywords,
        icon: <Icon className="h-4 w-4" aria-hidden />,
        onSelect: action.run,
      };
    });

    const seen = new Set<string>();
    const go: CommandItem[] = navGroups.flatMap((group) =>
      group.items
        .filter((item) => !seen.has(item.href) && seen.add(item.href))
        .map((item) => ({
          id: `go-${item.href}`,
          group: goGroup,
          title: item.labelText || menuTextString(item.label),
          // Название раздела — подписью и словом поиска: «отчёты баланс»
          // находит «Баланс».
          subtitle: group.titleText || undefined,
          keywords: group.titleText ? [group.titleText] : [],
          icon: <CornerDownRight className="h-4 w-4" aria-hidden />,
          onSelect: () => history.push(item.href),
        })),
    );

    return [...actions, ...go];
  }, [addActions, navGroups, history]);

  const sources = React.useMemo<CommandSource[]>(() => {
    const get = (url: string, params: Record<string, unknown>, signal: AbortSignal) =>
      apiRequest.http({
        method: 'get',
        url: `/api/${normalizeApiPath(url)}`,
        params,
        signal,
      });

    // Записи — все виды старого поиска, на которые у человека есть право.
    const records: CommandSource[] = abilityFilter(getUniversalSearchBinds()).map(
      (bind: any): CommandSource => ({
        id: bind.resourceType,
        group: bind.optionItemLabel,
        search: async (query, signal) => {
          const response = await get(
            getResourceUrlFromType(bind.resourceType),
            // Ровно то, что слал старый поиск: часть списков строго проверяет
            // параметры, и лишний отбор вернул бы ошибку вместо находок.
            { search_keyword: query },
            signal,
          );
          const { items: found } = transformResourceData(bind.resourceType)(response);
          return (found ?? []).slice(0, PER_SOURCE).map((record: any) => {
            const entry = bind.itemSelect ? bind.itemSelect(record) : record;
            return {
              id: `${bind.resourceType}-${entry.id}`,
              group: bind.optionItemLabel,
              title: String(entry.text ?? ''),
              // Подпись у части видов — разметка (сумма со значком); в
              // строку подсказки идёт только текст.
              subtitle: typeof entry.label === 'string' ? entry.label : undefined,
              onSelect: () =>
                dispatch(universalSearchSetSelectedItem(bind.resourceType, entry.id)),
            };
          });
        },
      }),
    );

    // Операции по сумме. Только с правом на деньги: без него сервер ответит
    // 403, а такой ответ включает общий экран «нет доступа».
    const canSeeMoney = permissionAllows(ability, {
      ability: CashflowAction.View,
      subject: AbilitySubject.Cashflow,
    });
    const operationsGroup = intl.get('command_palette.group.operations');
    const operations: CommandSource = {
      id: 'operations-by-amount',
      group: operationsGroup,
      minQuery: 1,
      search: async (query, signal) => {
        const amount = parseAmountQuery(query);
        if (amount === null) return [];
        const response = await get(
          '/banking/transactions',
          { page: 1, page_size: PER_SOURCE, minAmount: amount, maxAmount: amount },
          signal,
        );
        const rows: any[] = response?.data?.transactions ?? [];
        const found = rows
          .slice(0, PER_SOURCE)
          .map((row) =>
            registryRowToCommand(row, amount, operationsGroup, (href) => history.push(href)),
          );
        // Последним — все операции на эту сумму в реестре: находок может быть
        // больше пяти.
        return [
          ...found,
          {
            id: `operations-all-${amount}`,
            group: operationsGroup,
            title: intl.get('command_palette.operations_all', {
              amount: query.trim(),
            }),
            icon: <CornerDownRight className="h-4 w-4" aria-hidden />,
            onSelect: () => history.push(registryAmountLink(amount)),
          },
        ];
      },
    };

    return canSeeMoney ? [operations, ...records] : records;
  }, [apiRequest, abilityFilter, ability, dispatch, history]);

  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      items={items}
      sources={sources}
      debounceMs={250}
    />
  );
}
