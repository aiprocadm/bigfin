import * as React from 'react';
import intl from 'react-intl-universal';
import {
  ChevronDown,
  LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface SidebarItemData {
  href: string;
  label: React.ReactNode;
  /** Подпись строкой — подсказка у значка в свёрнутом меню. */
  labelText?: string;
  icon?: LucideIcon;
  active?: boolean;
  /** Число рядом с пунктом: сколько дел ждёт. Ноль и пустота не показываются. */
  count?: number | null;
}

export interface SidebarGroupData {
  /** Заголовок секции (необязательный — пункты без секции рендерятся без него). */
  title?: React.ReactNode;
  /** Заголовок строкой — подсказка у значка группы в свёрнутом меню. */
  titleText?: string;
  /** Значок группы в свёрнутом меню (UI-045-3 ТЗ-4). */
  icon?: LucideIcon;
  items: SidebarItemData[];
}

interface SidebarProps {
  /** Плоский список пунктов (простой режим). */
  items?: SidebarItemData[];
  /** Группированная навигация по секциям (приоритетнее items, если задана). */
  groups?: SidebarGroupData[];
  activeHref?: string;
  mini?: boolean;
  /** Свернуть / развернуть меню. Без него кнопки нет (экраны настроек). */
  onToggleMini?: () => void;
  onItemClick?: (item: SidebarItemData) => void;
  className?: string;
}

/**
 * Боковое меню.
 *
 * ГЛАВНАЯ РАБОТА МЕНЮ — показывать, ГДЕ ТЫ НАХОДИШЬСЯ. Всё остальное вторично:
 * список ссылок человек и так найдёт, а вот потерявшись, он теряет доверие ко
 * всему экрану.
 *
 * ЗАМЕР ДО ПЕРЕДЕЛКИ (20.09, живой проход): 36 пунктов, высота 1710 точек при
 * 843 видимых, и текущий пункт ТОГО ЖЕ ЦВЕТА, что остальные, — `rgb(0,82,204)`.
 * Отличие было только в жирности: 600 против 500.
 *
 * ПОЧЕМУ ЦВЕТ НЕ РАБОТАЛ. Blueprint красит ВСЕ ссылки правилом `a, a:hover`, и
 * это правило вне слоёв. Незаслоённое правило побеждает `@layer utilities`
 * независимо от специфичности — значит классы цвета на ссылках молча не
 * применялись вовсе. Лечение — в `globals.css`, там же и разбор.
 *
 * ТЕКУЩИЙ ПУНКТ РАЗЛИЧАЕТСЯ ПОВЕРХНОСТЬЮ: заливка `fill-1` на светлой
 * панели, чернила вместо приглушённого, полужирный вместо обычного — и
 * жёлтая точка слева (§7 ТЗ-4, решение R3).
 *
 * ЖЁЛТОГО В МЕНЮ — ОДНА ТОЧКА. Правило продукта: фирменный жёлтый метит ОДИН
 * смысловой момент. Раньше меню обходилось без него вовсе (полоска у каждого
 * раздела была бы забором). ТЗ-4 отдало жёлтую метку «где я» текущему
 * пункту — это единственный жёлтый в меню, и он маленький.
 *
 * СВЁРНУТОЕ МЕНЮ (UI-045-3) — значки групп шириной 64 точки; наведение
 * показывает название, нажатие открывает пункты группы списком. Выбор
 * запоминается (`ConnectedSidebar`).
 */
export const Sidebar = ({
  items,
  groups,
  activeHref,
  mini = false,
  onToggleMini,
  onItemClick,
  className,
}: SidebarProps) => {
  // Если переданы группы — рендерим их; иначе плоский список как одну секцию.
  const resolvedGroups: SidebarGroupData[] =
    groups ?? (items ? [{ items }] : []);

  return (
    <nav
      aria-label={intl.get('sidebar.aria_label')}
      className={cn(
        'flex h-full flex-col overflow-y-auto border-r border-border bg-background pb-3 transition-[width] duration-200 ease-standard',
        mini ? 'w-16' : 'w-60',
        className,
      )}
    >
      {/* Знак продукта над меню: шапка теперь стоит справа от меню, и
          место под ним сверху слева — как у окна приложения macOS. */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center',
          mini ? 'justify-center' : 'px-5',
        )}
      >
        {mini ? (
          <span className="text-headline font-bold text-text-primary" aria-hidden>
            B
          </span>
        ) : (
          <Logo size="sm" />
        )}
      </div>
      {(() => {
        // Когда текущая страница НЕ внутри раздела — а «Главная» именно
        // такая, — открытым остаётся первый раздел.
        //
        // Замер после первой сборки: на главной не был раскрыт ни один
        // раздел, и человек видел один пункт и семь закрытых заголовков.
        // Это перебор: до ежедневной работы («Операции» — разнести
        // вчерашнее) стало на клик дальше, чем было.
        const activeInsideGroup = resolvedGroups.some(
          (group) =>
            group.title &&
            group.items.some(
              (item) => item.href === activeHref || item.active,
            ),
        );
        const firstTitled = resolvedGroups.findIndex((group) => group.title);

        return resolvedGroups.map((group, gi) => (
          <SidebarGroup
            key={gi}
            group={group}
            activeHref={activeHref}
            mini={mini}
            onItemClick={onItemClick}
            isFirst={gi === 0}
            openByDefault={!activeInsideGroup && gi === firstTitled}
          />
        ));
      })()}
      {onToggleMini && (
        <button
          type="button"
          onClick={onToggleMini}
          aria-label={intl.get(mini ? 'sidebar.expand' : 'sidebar.collapse')}
          title={intl.get(mini ? 'sidebar.expand' : 'sidebar.collapse')}
          className={cn(
            // Кнопка сворачивания — только для ноутбука: на телефоне меню
            // выезжает поверх и закрывается само.
            'mx-2 mt-auto hidden min-h-9 items-center gap-3 rounded-control border-0 bg-transparent px-3 py-2 text-subhead text-text-secondary transition-colors md:flex',
            'hover:bg-fill-1 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
            mini && 'justify-center',
          )}
        >
          {mini ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden />
          )}
          {!mini && <span>{intl.get('sidebar.collapse')}</span>}
        </button>
      )}
    </nav>
  );
};

interface SidebarGroupProps {
  group: SidebarGroupData;
  activeHref?: string;
  mini?: boolean;
  onItemClick?: (item: SidebarItemData) => void;
  isFirst: boolean;
  /** Раскрыть, даже если текущей страницы внутри нет. */
  openByDefault?: boolean;
}

/**
 * Раздел меню.
 *
 * РАЗДЕЛЫ СВОРАЧИВАЮТСЯ, И ОТКРЫТ ТОТ, В КОТОРОМ ТЫ СЕЙЧАС. Меню было вдвое
 * длиннее экрана: 1710 точек при 843 видимых, половина за краем.
 *
 * Свёрнутый раздел остаётся ВИДИМОЙ ПОДПИСЬЮ, а не исчезает: у продукта уже
 * была беда «страница есть, а кликнуть негде» — ради неё написан отдельный
 * сторож достижимости. Прятать пункты совсем значит повторить её руками.
 */
const SidebarGroup = ({
  group,
  activeHref,
  mini,
  onItemClick,
  isFirst,
  openByDefault = false,
}: SidebarGroupProps) => {
  const hasActive = group.items.some(
    (item) => item.href === activeHref || item.active,
  );

  // Раздел с текущей страницей открыт всегда — даже если человек его закрывал.
  // Закрытый раздел, в котором ты находишься, прячет ответ на главный вопрос
  // меню.
  const [openedByHand, setOpenedByHand] = React.useState<boolean | null>(null);
  const open = hasActive || (openedByHand ?? openByDefault);

  // Свёрнутое меню: раздел — один значок, пункты — списком по нажатию.
  if (mini && group.title) {
    const Icon = group.icon;
    const label = group.titleText || '';
    return (
      <div className={cn('flex flex-col', !isFirst && 'mt-1')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={label}
              title={label}
              className={cn(
                'relative mx-2 flex min-h-10 items-center justify-center rounded-control border-0 px-3 py-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
                hasActive
                  ? 'bg-fill-1 text-text-primary'
                  : 'bg-transparent text-text-secondary hover:bg-fill-1/60 hover:text-text-primary',
              )}
            >
              {hasActive && <ActiveDot />}
              {Icon ? (
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
              ) : (
                <span className="text-subhead font-semibold">{label.slice(0, 1)}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-60">
            <DropdownMenuLabel>{group.title}</DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.href}
                onSelect={() => onItemClick?.(item)}
                className={cn(
                  (item.href === activeHref || item.active) &&
                    'font-semibold text-text-primary',
                )}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // У раздела без заголовка сворачивать нечего: это отдельно стоящий пункт
  // («Главная»), и заголовка у него нет по устройству меню.
  if (!group.title || mini) {
    return (
      <div
        className={cn(
          'flex flex-col gap-0.5',
          // Линии между разделами убраны: восемь разделов давали семь
          // горизонталей подряд — забор. Структуру держат заголовки и
          // воздух; линия была нужна, пока заголовок был такой же тихой
          // строкой, как пункты.
          !isFirst && 'mt-1',
        )}
      >
        {group.items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={item.href === activeHref || item.active}
            mini={mini}
            onClick={onItemClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col', !isFirst && 'mt-1')}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenedByHand(!open)}
        className={cn(
          'mx-2 flex items-center gap-2 rounded-control px-3 py-2 text-left text-subhead font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
          // Заголовок раздела с текущей страницей — чернилами: он часть
          // ответа «где я».
          //
          // ОСТАЛЬНЫЕ — ПРИГЛУШЁННЫЙ ТЕКСТ, А НЕ САМЫЙ БЛЕДНЫЙ. Посчитал
          // контраст: #8C95A3 на панели #F6F7F9 даёт 2,82:1 при норме 4,5:1.
          // Раньше под заголовком всегда стояли пункты и вытягивали раздел;
          // теперь у свёрнутого раздела заголовок — ЕДИНСТВЕННОЕ, что видно,
          // и читаться он обязан. #5B6472 даёт 5,58:1.
          hasActive
            ? 'text-text-primary'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <ChevronDown
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
            // Поворот, а не две разные стрелки: движение показывает, ЧТО
            // изменилось, и отвечает на нажатие человека.
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
        <span className="truncate">{group.title}</span>
      </button>

      {/* Раскрытие плавное (UI-045-3 ТЗ-4): высота растёт от нуля за
          200 мс, а не прыгает. Закрытые пункты не в порядке обхода с
          клавиатуры — `inert`, иначе Tab уходил бы в невидимое. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-standard',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        {...(open ? {} : { inert: '' })}
      >
        {/* Отступ равен ширине стрелки с промежутком: текст пункта встаёт
            ровно под текст заголовка, и видно, чему пункт принадлежит. */}
        <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden pl-[1.375rem]">
          {group.items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              active={item.href === activeHref || item.active}
              mini={mini}
              onClick={onItemClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface SidebarItemProps {
  item: SidebarItemData;
  active?: boolean;
  mini?: boolean;
  onClick?: (item: SidebarItemData) => void;
}

const SidebarItem = ({ item, active, mini, onClick }: SidebarItemProps) => {
  const Icon = item.icon;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(item);
  };

  // Ноль дел — это не «дело», и показывать его нечестно: пустой счётчик
  // выглядит так же, как непрочитанное, и заставляет открывать зря.
  const count = item.count && item.count > 0 ? item.count : null;

  return (
    <a
      href={item.href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      title={
        mini
          ? item.labelText ?? (typeof item.label === 'string' ? item.label : undefined)
          : undefined
      }
      aria-label={mini ? item.labelText : undefined}
      className={cn(
        // На телефоне пункт не ниже 44 px: палец накрывает примерно
        // сантиметр, а пункты идут вплотную — промах уводит в соседний
        // раздел. На больших экранах ограничение снимается, там указатель
        // точный и лишняя высота удлиняла бы список без пользы.
        // `no-underline` задан и на самом пункте: пункт меню — не ссылка
        // в тексте, а орган управления, и подчёркивание делает его
        // похожим на сноску.
        'relative mx-2 flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm no-underline transition-colors md:min-h-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
        active
          ? // ТЕКУЩИЙ ПУНКТ — ЗАЛИВКА НА СВЕТЛОЙ ПАНЕЛИ. Контраст
            // поверхности, а не цвета; плюс чернила, полужирный и жёлтая
            // точка — видно мгновенно.
            'bg-fill-1 font-semibold text-text-primary'
          : 'font-medium text-text-secondary hover:bg-fill-1/60 hover:text-text-primary',
        mini && 'justify-center',
      )}
    >
      {active && <ActiveDot />}
      {Icon && <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />}
      {!mini && <span className="truncate">{item.label}</span>}
      {!mini && count !== null && (
        <span className="money ml-auto min-w-5 rounded-full bg-surface px-1.5 text-xs font-semibold leading-5 text-text-secondary">
          {count}
        </span>
      )}
    </a>
  );
};

/**
 * Жёлтая точка текущего пункта (§7 ТЗ-4) — единственный жёлтый в меню.
 * Слева, в поле пункта, чтобы не сдвигать текст.
 */
const ActiveDot = () => (
  <span
    aria-hidden
    className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent"
  />
);
