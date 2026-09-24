import * as React from 'react';
import intl from 'react-intl-universal';
import { ChevronDown, LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface SidebarItemData {
  href: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  active?: boolean;
  /** Число рядом с пунктом: сколько дел ждёт. Ноль и пустота не показываются. */
  count?: number | null;
}

export interface SidebarGroupData {
  /** Заголовок секции (необязательный — пункты без секции рендерятся без него). */
  title?: React.ReactNode;
  items: SidebarItemData[];
}

interface SidebarProps {
  /** Плоский список пунктов (простой режим). */
  items?: SidebarItemData[];
  /** Группированная навигация по секциям (приоритетнее items, если задана). */
  groups?: SidebarGroupData[];
  activeHref?: string;
  mini?: boolean;
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
 * ТЕКУЩИЙ ПУНКТ РАЗЛИЧАЕТСЯ ПОВЕРХНОСТЬЮ, А НЕ КРАСКОЙ: белая «таблетка» на
 * серой панели, чернила вместо приглушённого, полужирный вместо обычного —
 * три отличия сразу, и ни одного нового цвета.
 *
 * ЖЁЛТОГО В МЕНЮ НЕТ, и это осознанно. Правило продукта: фирменный жёлтый
 * метит ОДИН смысловой момент на экране. На главной он уже стоит на точке
 * «сегодня» в ленте денег. Полоска в меню давала бы второй жёлтый момент — и
 * правило переставало бы работать. Убрать акцент, чтобы акцент остался
 * акцентом.
 */
export const Sidebar = ({
  items,
  groups,
  activeHref,
  mini = false,
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
        'flex h-full flex-col overflow-y-auto border-r border-border bg-surface-elevated py-3 transition-[width] duration-200',
        mini ? 'w-16' : 'w-60',
        className,
      )}
    >
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

      {open && (
        // Отступ равен ширине стрелки с промежутком: текст пункта встаёт
        // ровно под текст заголовка, и видно, чему пункт принадлежит.
        <div className="flex flex-col gap-0.5 pl-[1.375rem]">
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
      )}
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
      title={mini && typeof item.label === 'string' ? item.label : undefined}
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
          ? // ТЕКУЩИЙ ПУНКТ — БЕЛАЯ ТАБЛЕТКА НА СЕРОЙ ПАНЕЛИ. Контраст
            // поверхности, а не цвета: ни одного нового оттенка, а видно
            // мгновенно. Плюс чернила и полужирный — три отличия сразу.
            'bg-surface font-semibold text-text-primary shadow-[0_1px_2px_rgba(16,24,40,0.06)]'
          : 'font-medium text-text-secondary hover:bg-surface/70 hover:text-text-primary',
        mini && 'justify-center',
      )}
    >
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
