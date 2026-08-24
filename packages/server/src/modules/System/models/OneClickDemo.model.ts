import { Model } from 'objection';
import { BaseModel } from '@/models/Model';

/**
 * Демо-организация «в один щелчок» (Д1 карты v18).
 * `key` — случайный ключ, который отдаётся браузеру вместо пароля: по нему
 * (и только по нему) можно войти в созданное демо.
 */
export class OneClickDemo extends BaseModel {
  public key: string;
  public tenantId: number;
  public userId: number;
  public buildJobId: string | null;

  static get tableName() {
    return 'oneclick_demos';
  }

  static get timestamps() {
    return true;
  }

  static get relationMappings() {
    const { SystemUser } = require('./SystemUser');
    const { TenantModel } = require('./TenantModel');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: SystemUser,
        join: { from: 'oneclick_demos.userId', to: 'users.id' },
      },
      tenant: {
        relation: Model.BelongsToOneRelation,
        modelClass: TenantModel,
        join: { from: 'oneclick_demos.tenantId', to: 'tenants.id' },
      },
    };
  }
}
