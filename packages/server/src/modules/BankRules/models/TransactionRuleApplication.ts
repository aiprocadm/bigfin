// © 2026 Bigfin
import { BaseModel } from '@/models/Model';

/**
 * Одно применение автоправила к денежной операции (FT-036 ТЗ-3).
 * `transactionId` — номер денежной операции (`cashflow_transactions`).
 */
export class TransactionRuleApplication extends BaseModel {
  public id!: number;
  public transactionId!: number;
  public ruleId!: number;
  public appliedAt!: string;
  public changes!: string | null;

  static get tableName() {
    return 'transaction_rule_applications';
  }

  get timestamps() {
    return [];
  }
}
