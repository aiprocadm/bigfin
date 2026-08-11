import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';

/**
 * Права встроенной роли «Сотрудник».
 *
 * Два правила, без которых право не работает вовсе:
 *
 * 1. **`value: true` обязателен.** Сборка прав отбирает только включённые
 *    (`getRulesFromRolePermissions` → `.filter(p => p.value)`). Раньше колонка
 *    не заполнялась, в базе оставался `NULL`, и отбрасывались все права разом.
 * 2. **Действие пишется с заглавной.** Код спрашивает `SaleInvoiceAction.Create`
 *    («Create»), сверка регистрозависимая. Раньше здесь было «create», и ни одно
 *    право не совпадало.
 *
 * Каждой из двух причин хватало, чтобы приглашённый сотрудник не мог сделать
 * ничего — в том числе выписать счёт, ради чего роль и существует.
 */
const STAFF_ROLE_ID = 2;

/** Что доверено роли «Сотрудник»: повседневная работа с документами. */
export const STAFF_PERMISSION_SUBJECTS = [
  'SaleInvoice',
  'SaleEstimate',
  'SaleReceipt',
  'PaymentReceive',
  'Bill',
  'PaymentMade',
];

/** Действия — ровно так, как их спрашивает код. */
export const STAFF_PERMISSION_ABILITIES = ['Create', 'Delete', 'View', 'Edit'];

export const staffRolePermissions = () =>
  STAFF_PERMISSION_SUBJECTS.flatMap((subject) =>
    STAFF_PERMISSION_ABILITIES.map((ability) => ({
      roleId: STAFF_ROLE_ID,
      subject,
      ability,
      value: true,
    })),
  );

export default class SeedRolesAndPermissions extends TenantSeeder {
  /**
   * Seeds roles and associated permissions.
   * @param knex
   * @returns
   */
  // eslint-disable-next-line class-methods-use-this
  async up(knex) {
    return knex('role_permissions').insert(staffRolePermissions());
  }
}
