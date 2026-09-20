/**
 * Переключатели отчёта в адресной строке (FIN-012 ТЗ-2).
 *
 * ЗАЧЕМ. Всё управление отчётом жило в шторке «Настроить отчёт»: открыть →
 * найти поле → применить → закрыть. Четыре действия там, где нужно одно.
 * Период уже вынесли на страницу — это начатое и не доведённое направление.
 *
 * ПОЧЕМУ В АДРЕС, А НЕ В СОСТОЯНИЕ. Отчёт печатают и пересылают: «посмотри
 * нашу прибыль по кварталам кассовым методом» должно быть ссылкой, а не
 * инструкцией из четырёх шагов. Это уже принятое в проекте решение — им же
 * живут отборы реестра операций.
 *
 * Логика вынесена из компонента, чтобы проверяться без браузера: в адрес
 * попадает что угодно, включая опечатки из пересланной ссылки.
 */

/** Масштаб колонок отчёта. */
export const REPORT_SCALES = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'total',
] as const;

export type ReportScale = (typeof REPORT_SCALES)[number];

/** Метод учёта: кассовый или по начислению. */
export const REPORT_BASES = ['cash', 'accrual'] as const;

export type ReportBasis = (typeof REPORT_BASES)[number];

/** Способ построения колонок (FIN-014). */
export const REPORT_BUILD_BY = ['periods', 'projects', 'deals'] as const;

export type ReportBuildBy = (typeof REPORT_BUILD_BY)[number];

export interface ReportControls {
  scale?: ReportScale;
  basis?: ReportBasis;
  buildBy?: ReportBuildBy;
}

const pick = <T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);

/**
 * Читает переключатели из адреса.
 *
 * Мусор ОТБРАСЫВАЕТСЯ молча, а не роняет отчёт и не показывает пустоту:
 * опечатался тот, кто прислал ссылку, а смотрит её другой человек. Отчёт
 * при этом строится по умолчанию — это честнее пустого экрана.
 */
export function controlsFromSearch(search: string): ReportControls {
  const params = new URLSearchParams(search);
  const controls: ReportControls = {};

  const scale = pick(params.get('scale'), REPORT_SCALES);
  if (scale) controls.scale = scale;

  const basis = pick(params.get('basis'), REPORT_BASES);
  if (basis) controls.basis = basis;

  const buildBy = pick(params.get('buildBy'), REPORT_BUILD_BY);
  if (buildBy) controls.buildBy = buildBy;

  return controls;
}

/**
 * Дописывает переключатели в адрес, сохраняя остальные параметры.
 *
 * Их мог поставить кто-то другой — период, разрез по юрлицу, подсветка
 * строки, — и терять их при смене масштаба нельзя.
 */
export function searchWithControls(
  search: string,
  controls: ReportControls,
): string {
  const params = new URLSearchParams(search);

  const apply = (key: string, value?: string) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  apply('scale', controls.scale);
  apply('basis', controls.basis);
  apply('buildBy', controls.buildBy);

  const query = params.toString();

  return query ? `?${query}` : '';
}
