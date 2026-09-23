// © 2026 Bigfin

/**
 * Календарь организации (FT-006b ТЗ-3): с какого дня начинается неделя,
 * подсвечивать ли выходные, показывать ли дни недели.
 *
 * Влияет на масштабы «по неделям» и «по дням» в отчётах и в платёжном
 * календаре. Хранится в настройках организации (группа `organization`) —
 * тех же, где метод учёта: это решение организации, а не личный вкус.
 *
 * ПО УМОЛЧАНИЮ — ПОНЕДЕЛЬНИК. В России неделя начинается с понедельника, и
 * до этой настройки продукт так и считал; у тех, кто её не трогал, ничего
 * не сдвинется.
 */

export interface OrganizationCalendar {
  /** День начала недели по ISO: 1 — понедельник … 7 — воскресенье. */
  weekStartDay: number;
  highlightWeekends: boolean;
  showWeekdays: boolean;
}

export const DEFAULT_ORGANIZATION_CALENDAR: OrganizationCalendar = {
  weekStartDay: 1,
  highlightWeekends: true,
  showWeekdays: false,
};

/** Хранилище настроек в той мере, в какой оно нужно здесь. */
interface SettingsReader {
  get(query: { group: string; key: string }, defaultValue?: any): any;
}

/** День недели 1…7; мусор — понедельник. */
export function normalizeWeekStartDay(value: unknown): number {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 7 ? day : 1;
}

const asBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return !['0', 'false', 'no'].includes(String(value).toLowerCase());
};

export function readOrganizationCalendar(
  store: SettingsReader | null | undefined,
): OrganizationCalendar {
  if (!store) return { ...DEFAULT_ORGANIZATION_CALENDAR };

  const get = (key: string) => store.get({ group: 'organization', key });

  return {
    weekStartDay: normalizeWeekStartDay(get('week_start_day')),
    highlightWeekends: asBoolean(
      get('highlight_weekends'),
      DEFAULT_ORGANIZATION_CALENDAR.highlightWeekends,
    ),
    showWeekdays: asBoolean(
      get('show_weekdays'),
      DEFAULT_ORGANIZATION_CALENDAR.showWeekdays,
    ),
  };
}

/**
 * Сколько дней назад началась неделя, в которую попадает день.
 *
 * @param isoWeekday день недели даты по ISO (1 — понедельник)
 * @param weekStartDay день начала недели по ISO
 */
export function daysSinceWeekStart(
  isoWeekday: number,
  weekStartDay: number,
): number {
  return (isoWeekday - normalizeWeekStartDay(weekStartDay) + 7) % 7;
}
