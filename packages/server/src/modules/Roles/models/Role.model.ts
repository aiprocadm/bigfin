import { Model, mixin } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';
import { RolePermission } from './RolePermission.model';

export class Role extends TenantBaseModel {
  name: string;
  description: string;
  slug: string;
  predefined: boolean;
  permissions: Array<RolePermission>;

  /**
   * Юрлица, к которым допущена роль (этап 8 ТЗ, §8.4).
   *
   * Пусто или `null` — допущена ко ВСЕМ. Владелец и администратор не должны
   * ничего настраивать, чтобы видеть свою же организацию целиком.
   */
  allowedLegalEntityIds: number[] | null;

  /**
   * Table name
   */
  static get tableName() {
    return 'roles';
  }

  /**
   * Колонка со списком юрлиц — JSON.
   *
   * MySQL отдаёт её то массивом, то строкой: зависит от версии драйвера и от
   * того, как значение туда попало. Прочитанная строкой, она превратилась бы
   * в «список из одного непонятного элемента» — и роль потеряла бы доступ ко
   * всем юрлицам сразу.
   */
  static get jsonAttributes() {
    return ['allowedLegalEntityIds'];
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return [];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const { RolePermission } = require('./RolePermission.model');

    return {
      /**
       *
       */
      permissions: {
        relation: Model.HasManyRelation,
        modelClass: RolePermission,
        join: {
          from: 'roles.id',
          to: 'role_permissions.roleId',
        },
      },
    };
  }
}
