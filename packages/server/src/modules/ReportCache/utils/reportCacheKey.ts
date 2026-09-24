// © 2026 Bigfin
import { createHash } from 'crypto';

/**
 * Кэш отчётов (FT-093 ТЗ-3): что кэшируется и под каким ключом.
 *
 * КЛЮЧ — ПО ЧЕЛОВЕКУ, А НЕ ОБЩИЙ. Один и тот же отчёт с одними параметрами у
 * владельца и у сотрудника с ограничением по направлениям — РАЗНЫЕ числа
 * (FT-080). Общий ключ отдал бы сотруднику цифры владельца. Поэтому в ключе —
 * пользователь (или сотрудник, чьими глазами смотрят, FT-081), а ещё формат
 * ответа и язык: подписи строк переводятся.
 *
 * ПОКОЛЕНИЕ. Сброс кэша организации — это +1 к её «поколению»: старые записи
 * просто перестают находиться и умирают по сроку. Перебирать ключи в Redis не
 * нужно, и сброс мгновенный при любом объёме.
 */
export const REPORT_CACHE_TTL_SECONDS = 15 * 60;
/** Больше — не кэшируем: память Redis дороже редкого тяжёлого отчёта. */
export const REPORT_CACHE_MAX_BYTES = 5 * 1024 * 1024;
export const REPORT_CACHE_BYPASS_HEADER = 'x-bigfin-report-cache';

const REPORTS_PREFIX = '/api/reports/';
/** Служебные адреса внутри /reports — не отчёты. */
const NOT_REPORTS = ['/api/reports/cache'];

export function reportPathOf(url: string | undefined): string | null {
  const path = String(url ?? '').split('?')[0];
  if (!path.startsWith(REPORTS_PREFIX)) return null;
  if (NOT_REPORTS.some((prefix) => path.startsWith(prefix))) return null;
  return path;
}

/**
 * Кэшируется только JSON для экрана. Таблицы Excel/CSV и PDF — это файлы,
 * их просят редко, а права на выгрузку проверяются отдельно (FT-082).
 */
export function isCacheableAccept(accept: string | undefined): boolean {
  const value = String(accept ?? '');
  return !/application\/(xlsx|csv|pdf)/.test(value);
}

/** Параметры в одном порядке: `?a=1&b=2` и `?b=2&a=1` — один отчёт. */
export function canonicalQuery(query: Record<string, unknown> | undefined): string {
  const sort = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === 'object') {
      return Object.keys(value as object)
        .sort()
        .reduce((acc, key) => ({ ...acc, [key]: sort((value as any)[key]) }), {});
    }
    return value;
  };
  return JSON.stringify(sort(query ?? {}));
}

export interface ReportCacheKeyInput {
  organizationId: string;
  generation: number;
  viewerId: string;
  path: string;
  query: Record<string, unknown> | undefined;
  accept: string | undefined;
  locale: string | undefined;
}

export function reportCacheKey(input: ReportCacheKeyInput): string {
  const name = input.path.slice(REPORTS_PREFIX.length).replace(/[^a-z0-9/-]/gi, '');
  const digest = createHash('sha1')
    .update(
      [input.viewerId, canonicalQuery(input.query), input.accept ?? '', input.locale ?? ''].join('\u0000'),
    )
    .digest('hex');
  return `tenant:${input.organizationId}:report:${name}:g${input.generation}:${digest}`;
}

export const generationKey = (organizationId: string) => `tenant:${organizationId}:report-generation`;

/**
 * Какие изменяющие запросы НЕ сбрасывают кэш: они не трогают финансовых
 * данных, а сбрасывать кэш каждым щелчком по настройкам вида — жалко.
 * Сомневаешься — не добавляй сюда: лишний сброс стоит времени, пропущенный —
 * неверных чисел.
 */
export const NON_FINANCIAL_MUTATIONS = [
  '/api/reports/cache',
  '/api/mcp',
  '/api/notifications',
  // Настройки ВИДА (колонки, свёрнутые блоки) — не данные. Прочие настройки
  // (источники ОПиУ, неделя организации) меняют отчёты и сбрасывают кэш.
  '/api/settings/display-preferences',
  '/api/auth',
];

export function mutationInvalidates(method: string | undefined, url: string | undefined): boolean {
  const verb = String(method ?? '').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(verb)) return false;
  const path = String(url ?? '').split('?')[0];
  return !NON_FINANCIAL_MUTATIONS.some((prefix) => path.startsWith(prefix));
}
