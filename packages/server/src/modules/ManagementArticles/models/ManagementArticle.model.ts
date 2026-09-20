import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class ManagementArticle extends TenantBaseModel {
  name!: string;
  parentId!: number | null;
  kind!: string;
  cashflowSection!: string | null;
  sortOrder!: number;
  active!: boolean;
  costBehavior!: string | null; // 'fixed' | 'variable' | null — для точки безубыточности

  /**
   * Устойчивый ключ системной статьи (этап 17 ТЗ-2).
   *
   * Есть только у статей из сида; у заведённых человеком — `null`. По нему
   * догоняющая миграция понимает, что статья уже создана, и по нему же
   * экран отличает системную статью от пользовательской: системную можно
   * переименовать, но нельзя удалить и нельзя сменить ей вид.
   */
  seedKey!: string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'management_articles';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const {
      Account,
    } = require('../../Accounts/models/Account.model');

    return {
      /**
       * Article belongs to a parent article.
       */
      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: ManagementArticle,
        join: {
          from: 'management_articles.parentId',
          to: 'management_articles.id',
        },
      },

      /**
       * Article may have many child articles.
       */
      children: {
        relation: Model.HasManyRelation,
        modelClass: ManagementArticle,
        join: {
          from: 'management_articles.id',
          to: 'management_articles.parentId',
        },
      },

      /**
       * Article rolls up many accounts (through the mapping table).
       */
      accounts: {
        relation: Model.ManyToManyRelation,
        modelClass: Account,
        join: {
          from: 'management_articles.id',
          through: {
            from: 'management_article_accounts.articleId',
            to: 'management_article_accounts.accountId',
          },
          to: 'accounts.id',
        },
      },
    };
  }
}
