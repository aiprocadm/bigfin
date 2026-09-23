// © 2026 Bigfin
import { ForbiddenException } from '@nestjs/common';
import { ClsService, ClsServiceManager } from 'nestjs-cls';

/**
 * Режим проверки доступа (FT-081 ТЗ-3): владелец смотрит на Bigfin глазами
 * сотрудника — с его правами и ограничениями по статьям, направлениям и
 * счетам, но только для чтения.
 *
 * ЗАЧЕМ. Настроить роль и не проверить её — значит узнать об ошибке от
 * сотрудника, который увидел чужую зарплату. Проверить можно было, только
 * войдя под его паролем.
 *
 * КАК. Состояния на сервере нет: витрина прикладывает к каждому запросу
 * заголовок с номером сотрудника, сервер на каждом запросе проверяет, что его
 * прислал администратор организации и что сотрудник в ней есть. Права и
 * ограничения берутся сотрудника, а любое изменение — 403: владелец в этом
 * режиме смотрит, а не работает за другого.
 */
export const ACCESS_PREVIEW_HEADER = 'x-bigfin-access-preview';
const CLS_KEY = 'accessPreview';

export interface AccessPreview {
  /** Номер пользователя системы — им сервер узнаёт человека. */
  systemUserId: number;
  /** Номер сотрудника в организации — его знает витрина. */
  tenantUserId: number;
  name: string;
}

export const isReadOnlyMethod = (method: unknown): boolean =>
  ['GET', 'HEAD', 'OPTIONS'].includes(String(method ?? '').toUpperCase());

export function previewTargetId(request: any): number | null {
  const raw = request?.headers?.[ACCESS_PREVIEW_HEADER];
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const forbidden = (type: string, message: string) =>
  new ForbiddenException({ errors: [{ type, message }] });

/**
 * Проверяет заголовок режима и запоминает ответ на весь запрос. Звать можно
 * сколько угодно раз: база спрашивается один раз.
 *
 * @returns сотрудник, чьими глазами смотрим, или null — режима нет
 */
export async function resolveAccessPreview(
  request: any,
  cls: ClsService,
  tenantUserModel: () => any,
): Promise<AccessPreview | null> {
  const cached = cls.get(CLS_KEY);
  if (cached !== undefined) return cached || null;

  const targetId = previewTargetId(request);
  if (!targetId) {
    cls.set(CLS_KEY, false);
    return null;
  }
  const requester: any = await tenantUserModel()
    .query()
    .findOne('systemUserId', cls.get('userId'))
    .withGraphFetched('role');
  if (requester?.role?.slug !== 'admin') {
    throw forbidden(
      'ACCESS_PREVIEW_OWNER_ONLY',
      'Смотреть глазами сотрудника может только администратор организации.',
    );
  }
  const target: any = await tenantUserModel().query().findById(targetId);
  if (!target?.systemUserId) {
    throw forbidden('ACCESS_PREVIEW_USER_NOT_FOUND', 'Такого сотрудника в организации нет.');
  }
  const preview: AccessPreview = {
    systemUserId: Number(target.systemUserId),
    tenantUserId: Number(target.id),
    name: target.fullName?.trim() || target.email || '',
  };
  cls.set(CLS_KEY, preview);
  return preview;
}

/** Отказ на любое изменение в режиме проверки. */
export function assertPreviewReadOnly(preview: AccessPreview | null, method: unknown): void {
  if (preview && !isReadOnlyMethod(method)) {
    throw forbidden(
      'ACCESS_PREVIEW_READ_ONLY',
      'Режим проверки доступа: изменения недоступны. Выйдите из режима, чтобы работать.',
    );
  }
}

/** Режим текущего запроса — для сервисов без доступа к запросу. */
export function currentAccessPreview(): AccessPreview | null {
  try {
    const cls = ClsServiceManager.getClsService();
    if (!cls?.isActive()) return null;
    return cls.get(CLS_KEY) || null;
  } catch {
    return null;
  }
}
