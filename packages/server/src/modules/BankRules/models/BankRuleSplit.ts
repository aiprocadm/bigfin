// © 2026 Bigfin
import { BaseModel } from '@/models/Model';

/**
 * Строка правила «Разбить и заполнить» (FT-031 ТЗ-3): доля суммы операции
 * и куда она уходит — статья, направление, контрагент.
 */
export class BankRuleSplit extends BaseModel {
  public id!: number;
  public ruleId!: number;
  public sharePercent!: number;
  public articleId!: number | null;
  public projectId!: number | null;
  public contactId!: number | null;
  public sortOrder!: number;

  static get tableName() {
    return 'bank_rule_splits';
  }

  get timestamps() {
    return [];
  }
}
