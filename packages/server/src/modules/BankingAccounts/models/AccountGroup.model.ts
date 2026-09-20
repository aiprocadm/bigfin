// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Пользовательская группа денежных счетов (FIN-017 ТЗ-2).
 *
 * Это НЕ план счетов. План счетов — бухгалтерская иерархия (`parentAccountId`),
 * а группа — то, как человек держит счета в голове: «операционные»,
 * «депозиты», «личные». Смешение двух измерений сломало бы отчёты.
 */
export class AccountGroup extends TenantBaseModel {
  name!: string;
  sortOrder!: number;
  active!: boolean;

  static get tableName() {
    return 'account_groups';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
