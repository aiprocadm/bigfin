// © 2026 Bigfin
import { BaseModel } from '@/models/Model';

/**
 * Токен публичного API (этап 15 ТЗ).
 *
 * Живёт в ОБЩЕЙ (system) схеме, и это не путаница: токен приходит один, без
 * указания организации, — по нему организацию ещё только предстоит найти.
 * Лежи он в базе организации, пришлось бы обходить все базы подряд.
 *
 * Самого токена здесь нет — только отпечаток. Утечка этой таблицы не даёт
 * доступа ни к одной организации.
 */
export class ApiToken extends BaseModel {
  public tenantId: number;
  public userId: number | null;
  public name: string;
  public tokenHash: string;
  public lastFour: string;
  /** JSON-строка со списком прав. Пустой список — это НЕ «можно всё». */
  public scopes: string | null;
  public expiresAt: Date | null;
  public revokedAt: Date | null;
  public lastUsedAt: Date | null;

  static get tableName() {
    return 'api_tokens';
  }

  static get timestamps() {
    return true;
  }
}
