import { BaseModel } from '@/models/Model';
import { Model } from 'objection';
import { BankRuleCondition } from './BankRuleCondition';
import { BankRuleAssignCategory, BankRuleConditionType } from '../types';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class BankRule extends TenantBaseModel {
  public readonly id!: number;
  public readonly name!: string;
  public readonly order!: number;
  public readonly applyIfAccountId!: number;
  public readonly applyIfTransactionType!: string;
  public readonly assignCategory!: BankRuleAssignCategory;
  public readonly assignAccountId!: number;
  public readonly assignPayee!: string;
  public readonly assignMemo!: string;
  public readonly conditionsType!: BankRuleConditionType;

  /** Тип правила (FT-030…FT-032 ТЗ-3): assign | split | transfer | deal. */
  public readonly ruleType!: string;
  /** Пауза (FT-035): правило есть, но не срабатывает. */
  public readonly pausedAt!: string | null;
  /** Счёт-получатель правила «Преобразовать в перевод». */
  public readonly transferToAccountId!: number | null;
  public readonly assignDealId!: number | null;
  public readonly assignDealStageId!: number | null;
  /** Направление, которое ставит правило. */
  public readonly assignProjectId!: number | null;
  /** Контрагент, которого ставит правило. */
  public readonly assignContactId!: number | null;
  public readonly assignTag!: string | null;

  public readonly conditions!: BankRuleCondition[];
  public readonly splits!: any[];

  public readonly createdAt: string;
  public readonly updatedAt: string;

  /**
   * Table name
   */
  static get tableName() {
    return 'bank_rules';
  }

  /**
   * Timestamps columns.
   */
  static get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Virtual attributes.
   */
  static get virtualAttributes() {
    return [];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const { BankRuleCondition } = require('./BankRuleCondition');
    const { BankRuleSplit } = require('./BankRuleSplit');
    const { Account } = require('../../Accounts/models/Account.model');

    return {
      /**
       * Sale invoice associated entries.
       */
      conditions: {
        relation: Model.HasManyRelation,
        modelClass: BankRuleCondition,
        join: {
          from: 'bank_rules.id',
          to: 'bank_rule_conditions.ruleId',
        },
      },

      /**
       * Строки разбиения правила «Разбить и заполнить» (FT-031).
       */
      splits: {
        relation: Model.HasManyRelation,
        modelClass: BankRuleSplit,
        join: {
          from: 'bank_rules.id',
          to: 'bank_rule_splits.ruleId',
        },
      },

      /**
       * Bank rule may associated to the assign account.
       */
      assignAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'bank_rules.assignAccountId',
          to: 'accounts.id',
        },
      },
    };
  }
}
