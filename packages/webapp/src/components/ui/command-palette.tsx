import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import intl from 'react-intl-universal';
import { Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import { DrawerOverlay } from './drawer';
import { type CommandItem, type CommandSource, filterCommands, groupCommands } from './command-search';
import { useIsPhone } from './use-media-query';

/**
 * Командная строка (UI-044-7 ТЗ-4, R11) — как Spotlight в macOS.
 *
 * Одно окно ищет всё: действия («Добавить приход»), переходы («Открыть
 * баланс») и записи из источников (контрагенты, счета, операции). Старый
 * поиск смотрел один вид записей за раз, и «ничего не найдено» на экране
 * счетов при имени клиента читалось как «такого клиента нет».
 *
 * Клавиатура: ↑ ↓ — выбор, Enter — выполнить, Esc — закрыть. Подключение к
 * шапке и ⌘K / Ctrl+K — этап 45 (`useCommandPaletteShortcut`).
 */
export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  sources?: CommandSource[];
  /** Задержка перед запросом к источникам, мс. */
  debounceMs?: number;
}

/**
 * Постоянный пустой список: новый `[]` на каждой отрисовке считался бы
 * «другими источниками», поиск перезапускался бы по кругу без конца.
 */
const NO_SOURCES: CommandSource[] = [];

export function CommandPalette({
  open,
  onOpenChange,
  items,
  sources = NO_SOURCES,
  debounceMs = 200,
}: CommandPaletteProps) {
  const isPhone = useIsPhone();
  const [query, setQuery] = React.useState('');
  const [found, setFound] = React.useState<CommandItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setFound([]);
      setActive(0);
    }
  }, [open]);

  // Источники спрашиваем после паузы в наборе; прежний запрос отменяем.
  React.useEffect(() => {
    const ready = sources.filter((source) => query.trim().length >= (source.minQuery ?? 2));
    if (!open || ready.length === 0) {
      setFound((prev) => (prev.length ? [] : prev));
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      Promise.allSettled(ready.map((source) => source.search(query.trim(), controller.signal))).then(
        (results) => {
          if (controller.signal.aborted) return;
          setFound(
            results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
          );
          setLoading(false);
        },
      );
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, sources, debounceMs]);

  const results = React.useMemo(() => [...filterCommands(items, query), ...found], [items, query, found]);
  const groups = groupCommands(results);

  React.useEffect(() => setActive(0), [query]);

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.onSelect();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[active]);
    }
  };

  let position = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DrawerOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          className={cn(
            'bigfin-portal box-border font-sans fixed z-50 flex flex-col overflow-hidden bg-surface text-text-primary shadow-elev-2',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-220 ease-standard',
            isPhone
              ? 'inset-0'
              : 'left-1/2 top-[12vh] max-h-[70vh] w-full max-w-xl -translate-x-1/2 rounded-default border border-border',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{intl.get('command_palette.title')}</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-5 w-5 shrink-0 text-text-muted" aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={intl.get('command_palette.placeholder')}
              className="h-14 w-full bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <div id={listId} role="listbox" aria-label={intl.get('command_palette.title')} className="min-h-0 flex-1 overflow-y-auto p-2">
            {groups.map(({ group, items: groupItems }) => (
              <div key={group} role="group" aria-label={group} className="mb-2">
                <div className="px-2 py-1 text-footnote text-text-muted">{group}</div>
                {groupItems.map((item) => {
                  position += 1;
                  const index = position;
                  return (
                    <div
                      key={item.id}
                      id={`${listId}-${item.id}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => run(item)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-control px-2 py-2',
                        index === active ? 'bg-fill-1' : '',
                      )}
                    >
                      {item.icon && <span className="shrink-0 text-text-secondary">{item.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body">{item.title}</span>
                        {item.subtitle && (
                          <span className="block truncate text-subhead text-text-secondary">{item.subtitle}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {loading && <div className="px-2 py-2 text-subhead text-text-muted">{intl.get('command_palette.searching')}</div>}
            {!loading && results.length === 0 && (
              <div className="px-2 py-6 text-center text-body text-text-muted">{intl.get('command_palette.nothing')}</div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** ⌘K на Mac и Ctrl+K на остальных открывают командную строку. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}
