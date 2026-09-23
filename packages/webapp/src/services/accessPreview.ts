// © 2026 Bigfin
/**
 * Режим проверки доступа (FT-081 ТЗ-3): владелец смотрит на Bigfin глазами
 * сотрудника — только для чтения.
 *
 * Состояние живёт в браузере владельца: какой сотрудник и в какой
 * организации. Каждый запрос несёт заголовок с номером сотрудника, а сервер
 * на каждом запросе сам проверяет, что прислал его администратор.
 *
 * Хранилище браузера бывает недоступно (приватное окно, запрет сайта) —
 * тогда режима просто нет, приложение работает как обычно.
 */
export const ACCESS_PREVIEW_HEADER = 'x-bigfin-access-preview';
const STORAGE_KEY = 'bigfin.accessPreview';

export interface AccessPreviewState {
  userId: number;
  name: string;
  organizationId: string;
}

export function readAccessPreview(): AccessPreviewState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return Number(value?.userId) > 0 && value?.organizationId ? value : null;
  } catch {
    return null;
  }
}

export function writeAccessPreview(state: AccessPreviewState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Некуда записать — режим не включится, это честнее полуработающего.
  }
}

export function clearAccessPreview(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Нечего стирать.
  }
}

/** Номер сотрудника для заголовка — только в той организации, где начали. */
export function accessPreviewHeaderValue(organizationId?: string | null): string | null {
  const state = readAccessPreview();
  if (!state || !organizationId || String(state.organizationId) !== String(organizationId)) {
    return null;
  }
  return String(state.userId);
}

/** Ответ сервера «режим проверки не принят» — режим надо снять. */
export function isAccessPreviewRejected(data: any): boolean {
  const types = (data?.errors ?? []).map((e: any) => e?.type);
  return types.includes('ACCESS_PREVIEW_OWNER_ONLY') || types.includes('ACCESS_PREVIEW_USER_NOT_FOUND');
}

/** Ответ «в режиме проверки менять нельзя». */
export function isAccessPreviewReadOnly(data: any): boolean {
  return (data?.errors ?? []).some((e: any) => e?.type === 'ACCESS_PREVIEW_READ_ONLY');
}

/** Выйти из режима: стереть и перезагрузить — права и данные у владельца свои. */
export function exitAccessPreview(): void {
  clearAccessPreview();
  window.location.assign('/');
}
