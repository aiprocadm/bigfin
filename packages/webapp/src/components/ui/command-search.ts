import type * as React from 'react';

/**
 * Пункт командной строки (UI-044-7 ТЗ-4): действие, переход или найденная
 * запись.
 */
export interface CommandItem {
  id: string;
  /** Раздел, в котором показывается пункт: «Действия», «Перейти», «Контрагенты». */
  group: string;
  title: string;
  subtitle?: string;
  /** Дополнительные слова для поиска: «приход деньги пришли». */
  keywords?: string[];
  icon?: React.ReactNode;
  onSelect: () => void;
}

/** Источник записей: ищет на сервере по набранной строке. */
export interface CommandSource {
  id: string;
  group: string;
  /** С какой длины запроса искать (по умолчанию 2 символа). */
  minQuery?: number;
  search: (query: string, signal: AbortSignal) => Promise<CommandItem[]>;
}

/** Строка для сравнения: регистр и «ё» не важны. */
export const normalize = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();

/**
 * Насколько пункт подходит к запросу: 3 — название начинается с запроса,
 * 2 — с запроса начинается слово названия, 1 — запрос внутри названия,
 * подписи или ключевых слов, 0 — не подходит. Все слова запроса должны
 * найтись («добав прих» находит «Добавить приход»).
 */
export function scoreCommand(item: CommandItem, query: string): number {
  const q = normalize(query);
  if (!q) return 1;
  const title = normalize(item.title);
  const haystack = [title, normalize(item.subtitle ?? ''), ...(item.keywords ?? []).map(normalize)].join(' ');
  const words = q.split(/\s+/);
  if (!words.every((word) => haystack.includes(word))) return 0;
  if (title.startsWith(q)) return 3;
  if (title.split(/[\s«»"()-]+/).some((word) => word.startsWith(words[0]))) return 2;
  return 1;
}

/** Подходящие пункты, лучшие первыми; внутри равных — прежний порядок. */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  return items
    .map((item, index) => ({ item, index, score: scoreCommand(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

/** Пункты по разделам в порядке первого появления раздела. */
export function groupCommands(items: CommandItem[]): Array<{ group: string; items: CommandItem[] }> {
  const groups: Array<{ group: string; items: CommandItem[] }> = [];
  for (const item of items) {
    const found = groups.find((entry) => entry.group === item.group);
    if (found) found.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}
