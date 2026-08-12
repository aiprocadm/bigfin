// © 2026 Bigfin
// Отчёты по контрагентам роли «Сотрудник» у организаций, созданных раньше.
//
// Шаг В1 карты v9: половина отчётов не спрашивала прав вовсе, и приглашённый
// человек видел в том числе оборотно-сальдовую ведомость — обороты и остатки
// по ВСЕМ счетам организации. Теперь права спрашивают все отчёты, а роль
// «Сотрудник» получает четыре отчёта по контрагентам: с кем сколько
// наработали и кто сколько должен. Это продолжение его работы со счетами.
//
// Общая финансовая картина (Баланс, ОПиУ, движение денег, главная книга,
// журнал, ОСВ, продажи и закупки по позициям, склад, налог) остаётся
// администратору.
//
// Правка добавляющая и идемпотентная.

// Имена уникальны нарочно: миграции — глобальные скрипты без импортов.
const REPORT_ABILITIES = [
  'read-customers-transactions',
  'read-vendors-transactions',
  'read-customers-summary-balance',
  'read-vendors-summary-balance',
];

const reportsStaffRoleId = async (knex) => {
  const role = await knex('roles')
    .where({ slug: 'staff', predefined: true })
    .first('id');

  return role?.id ?? null;
};

exports.up = async (knex) => {
  const roleId = await reportsStaffRoleId(knex);

  if (!roleId) return;

  for (const ability of REPORT_ABILITIES) {
    const existing = await knex('role_permissions')
      .where({ role_id: roleId, subject: 'Report', ability })
      .first('id');

    if (existing) {
      await knex('role_permissions')
        .where({ id: existing.id })
        .update({ value: true });
    } else {
      await knex('role_permissions').insert({
        role_id: roleId,
        subject: 'Report',
        ability,
        value: true,
      });
    }
  }
};

exports.down = async (knex) => {
  const roleId = await reportsStaffRoleId(knex);

  if (!roleId) return;

  await knex('role_permissions')
    .where({ role_id: roleId, subject: 'Report' })
    .whereIn('ability', REPORT_ABILITIES)
    .delete();
};
