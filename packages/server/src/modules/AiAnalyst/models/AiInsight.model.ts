// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Суточный кеш выводов ИИ-аналитика (этап 13 ТЗ, §13.3).
 *
 * Хранится результат, а не запрос: иначе десять человек в организации за утро
 * оплатили бы десять одинаковых ответов, каждый подождав по несколько секунд.
 */
export class AiInsight extends TenantBaseModel {
  public scope: string;
  public generatedFor: Date | string;
  /** Список наблюдений строкой JSON. */
  public insights: string;
  public suggestedCount: number;
  /** Сколько отбраковано сверкой чисел — без этого не видно, что модель врёт. */
  public rejectedCount: number;
  public provider: string | null;

  static get tableName() {
    return 'ai_insights';
  }

  static get timestamps() {
    return true;
  }
}
