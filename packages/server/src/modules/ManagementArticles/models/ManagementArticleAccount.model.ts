import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class ManagementArticleAccount extends TenantBaseModel {
  articleId!: number;
  accountId!: number;

  /**
   * Table name.
   */
  static get tableName() {
    return 'management_article_accounts';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
