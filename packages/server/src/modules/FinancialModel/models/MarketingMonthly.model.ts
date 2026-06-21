// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/** Помесячный расход и число новых клиентов по каналу привлечения. */
export class MarketingMonthly extends TenantBaseModel {
  channelId!: number;
  month!: string; // 'YYYY-MM'
  spend!: number;
  newCustomers!: number;

  static get tableName() {
    return 'marketing_monthly';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { MarketingChannel } = require('./MarketingChannel.model');

    return {
      channel: {
        relation: Model.BelongsToOneRelation,
        modelClass: MarketingChannel,
        join: {
          from: 'marketing_monthly.channelId',
          to: 'marketing_channels.id',
        },
      },
    };
  }
}
