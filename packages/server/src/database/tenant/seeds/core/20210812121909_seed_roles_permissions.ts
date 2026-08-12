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

/**
 * Просмотр вложений — отдельной строкой.
 *
 * Прикреплять файлы к документу сотрудник может и без права (у загрузки его
 * нет), а вот открыть прикреплённое — уже по праву. Без этой строки он
 * приложил бы договор к счёту и не смог бы его потом открыть.
 *
 * Удаление вложений сотруднику НЕ даётся: убрать чужой файл — действие
 * тяжелее повседневного, оно остаётся за владельцем.
 */
const STAFF_ATTACHMENT_PERMISSION = {
  subject: 'Attachment',
  ability: 'View',
};

/**
 * Приложить файл к своему документу — повседневная работа: договор к счёту,
 * акт к закупке. Права на это в схеме не было вовсе, поэтому файл прикладывал
 * кто угодно; теперь оно есть, и роль его получает. Отвязывать и удалять
 * чужие файлы сотруднику по-прежнему нельзя.
 */
const STAFF_ATTACHMENT_CREATE_PERMISSION = {
  subject: 'Attachment',
  ability: 'Create',
};

/**
 * Справочники — мягкий вариант (§5 вопрос 10 карты v8).
 *
 * Живая проба показала, что без этих строк роль нерабочая в интерфейсе:
 * списки покупателей, поставщиков и товаров закрыты правами, а у роли их не
 * было ни одного. Сотрудник, которому доверено выписывать счета, не видел ни
 * одного контрагента и не мог выбрать позицию — то есть не мог сделать ровно
 * то, ради чего роль существует.
 *
 * Завести контрагента прямо при выписке счёта — повседневная работа, поэтому
 * даются просмотр, создание и правка. **Удаление не даётся**: убрать карточку
 * с историей документов — действие тяжелее повседневного.
 */
export const STAFF_CATALOG_SUBJECTS = ['Customer', 'Vendor', 'Item'];

export const STAFF_CATALOG_ABILITIES = ['View', 'Create', 'Edit'];

/**
 * Отчёты, которые видит роль «Сотрудник» (шаг В1 карты v9).
 *
 * Ему оставлены отчёты ПО КОНТРАГЕНТАМ: с кем сколько наработали и кто сколько
 * должен — это продолжение его повседневной работы со счетами и оплатами.
 *
 * Общая финансовая картина организации — Баланс, ОПиУ, движение денег, главная
 * книга, журнал, оборотно-сальдовая ведомость, продажи и закупки по позициям,
 * склад и налог — остаётся администратору. До этой правки половина отчётов не
 * спрашивала прав вовсе, и сотрудник видел в том числе оборотно-сальдовую
 * ведомость по всем счетам организации.
 */
export const STAFF_REPORT_ABILITIES = [
  'read-customers-transactions',
  'read-vendors-transactions',
  'read-customers-summary-balance',
  'read-vendors-summary-balance',
];

export const staffRolePermissions = () => [
  ...STAFF_PERMISSION_SUBJECTS.flatMap((subject) =>
    STAFF_PERMISSION_ABILITIES.map((ability) => ({
      roleId: STAFF_ROLE_ID,
      subject,
      ability,
      value: true,
    })),
  ),
  { roleId: STAFF_ROLE_ID, ...STAFF_ATTACHMENT_PERMISSION, value: true },
  { roleId: STAFF_ROLE_ID, ...STAFF_ATTACHMENT_CREATE_PERMISSION, value: true },
  ...STAFF_CATALOG_SUBJECTS.flatMap((subject) =>
    STAFF_CATALOG_ABILITIES.map((ability) => ({
      roleId: STAFF_ROLE_ID,
      subject,
      ability,
      value: true,
    })),
  ),
  ...STAFF_REPORT_ABILITIES.map((ability) => ({
    roleId: STAFF_ROLE_ID,
    subject: 'Report',
    ability,
    value: true,
  })),
];

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
