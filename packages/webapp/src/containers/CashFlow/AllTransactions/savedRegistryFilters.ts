// © 2026 Bigfin
import type { ScreenFilters } from './allTransactionsFilters';

/**
 * Сохранённые фильтры реестра (FT-021 ТЗ-3): «Сохранить фильтр» → имя →
 * «Быстрые фильтры». Личные — в настройках человека, общие — в
 * настройках организации.
 *
 * Логика без React — чтобы её держали тесты: AC требует, чтобы
 * сохранённый фильтр восстанавливал ВСЕ поля (период, тип, счёт, статью,
 * направление, поиск), а забытое в списке поле теряется молча.
 */

/** Что запоминает фильтр. Режим показа («ждут разноски») — не отбор. */
export const SAVED_FILTER_KEYS = [
  'fromDate',
  'toDate',
  'flow',
  'accountId',
  'articleId',
  'projectId',
  'contactId',
  'search',
  'tag',
  'states',
  'minAmount',
  'maxAmount',
] as const;

export interface SavedRegistryFilter {
  id: string;
  name: string;
  /** Общий для организации (виден всем) или личный. */
  shared: boolean;
  filters: Partial<ScreenFilters>;
}

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

/** Снимок текущих отборов: только заданные поля из белого списка. */
export function snapshotFilters(filters: ScreenFilters): Partial<ScreenFilters> {
  const result: Record<string, unknown> = {};
  SAVED_FILTER_KEYS.forEach((key) => {
    const value = (filters as any)[key];
    if (!isEmpty(value)) result[key] = Array.isArray(value) ? [...value] : value;
  });
  return result as Partial<ScreenFilters>;
}

/** Применить сохранённый: ровно его отборы, прежние не подмешиваются. */
export function applySavedFilter(saved: SavedRegistryFilter): ScreenFilters {
  return snapshotFilters(saved.filters as ScreenFilters) as ScreenFilters;
}

/** Сохранить: одинаковое имя в той же области — замена, а не дубль. */
export function upsertSavedFilter(
  list: SavedRegistryFilter[],
  name: string,
  filters: ScreenFilters,
  shared: boolean,
): SavedRegistryFilter[] {
  const clean = name.trim().slice(0, 60);
  const existing = list.find((item) => item.name.toLowerCase() === clean.toLowerCase());
  const next: SavedRegistryFilter = {
    id: existing?.id ?? `${shared ? 's' : 'p'}-${Date.now().toString(36)}`,
    name: clean,
    shared,
    filters: snapshotFilters(filters),
  };
  return existing ? list.map((item) => (item.id === existing.id ? next : item)) : [...list, next];
}

export function removeSavedFilter(list: SavedRegistryFilter[], id: string): SavedRegistryFilter[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Разбор того, что пришло из хранилища. Мусор отбрасывается, а не роняет
 * экран: общие фильтры правит вся команда, и одна кривая запись не должна
 * лишать остальных их фильтров.
 */
export function parseSavedFilters(raw: unknown, shared: boolean): SavedRegistryFilter[] {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: any) => item && typeof item.name === 'string' && item.name.trim() && item.filters)
    .map((item: any) => ({
      id: String(item.id ?? item.name),
      name: String(item.name),
      shared,
      filters: snapshotFilters(item.filters),
    }));
}
