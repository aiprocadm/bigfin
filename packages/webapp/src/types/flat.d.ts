/**
 * Минимальные типы для пакета `flat` (у него нет собственных деклараций).
 * Нужны, чтобы строгие TS-файлы могли импортировать flatten/unflatten.
 */
declare module 'flat' {
  export function flatten(target: unknown, options?: unknown): unknown;
  export function unflatten(target: unknown, options?: unknown): unknown;
}
