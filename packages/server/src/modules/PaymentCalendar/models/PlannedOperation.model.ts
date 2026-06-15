import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PlannedOperation extends TenantBaseModel {
  direction!: string;
  amount!: number;
  currencyCode!: string;
  plannedDate!: string;
  articleId!: number | null;
  accountId!: number | null;
  branchId!: number | null;
  projectId!: number | null;
  contactId!: number | null;
  status!: string;
  sourceType!: string | null;
  sourceId!: number | null;
  recurrence!: Record<string, any> | null;
  description!: string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'planned_operations';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Columns stored as JSON.
   */
  static get jsonAttributes() {
    return ['recurrence'];
  }

  /**
   * Query modifiers.
   */
  static get modifiers() {
    return {
      /**
       * Operations that feed the forecast (planned + confirmed, not done/cancelled).
       */
      forecastable(query) {
        query.whereIn('status', ['planned', 'confirmed']);
      },

      /**
       * One-off (non-recurring) operations within a date range.
       */
      oneOffBetween(query, fromDate: string, toDate: string) {
        query
          .whereNull('recurrence')
          .where('plannedDate', '>=', fromDate)
          .where('plannedDate', '<=', toDate);
      },

      /**
       * Recurring operations whose anchor date is on/before the horizon end.
       */
      recurringBefore(query, toDate: string) {
        query.whereNotNull('recurrence').where('plannedDate', '<=', toDate);
      },

      /**
       * Filter by direction (inflow/outflow).
       */
      filterByDirection(query, direction: string) {
        query.where('direction', direction);
      },

      /**
       * Filter by cash account.
       */
      filterByAccount(query, accountId: number) {
        query.where('accountId', accountId);
      },
    };
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const {
      ManagementArticle,
    } = require('../../ManagementArticles/models/ManagementArticle.model');

    return {
      /**
       * Planned operation belongs to a management article.
       */
      article: {
        relation: Model.BelongsToOneRelation,
        modelClass: ManagementArticle,
        join: {
          from: 'planned_operations.articleId',
          to: 'management_articles.id',
        },
      },
    };
  }
}
