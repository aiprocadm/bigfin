// © 2026 Bigfin
// Справочники встроенной роли «Сотрудник» у организаций, созданных раньше.
//
// Списки покупателей, поставщиков и товаров закрыты правами давно, а у роли
// «Сотрудник» не было на них ни одного права. Живая проба: сотрудник получал
// отказ на список покупателей и на список товаров — то есть не мог выбрать,
// кому и что выставлять, хотя выписка счетов и есть смысл этой роли.
//
// Мягкий вариант (§5 вопрос 10 карты v8): просмотр, создание и правка — да,
// удаление — нет. Убрать карточку с историей документов тяжелее повседневного.
//
// Правка добавляющая и идемпотентная: строки, которых нет, добавляются; если
// владелец уже завёл такое право руками, оно остаётся как есть и второй раз
// не появляется.

// Имена уникальны нарочно: миграции — глобальные скрипты без импортов, и
// одинаковые имена в соседних файлах ломают проверку типов.
const CATALOG_SUBJECTS = ['Customer', 'Vendor', 'Item'];
const CATALOG_ABILITIES = ['View', 'Create', 'Edit'];

/** Идентификатор встроенной роли «Сотрудник» этой организации. */
const catalogStaffRoleId = async (knex) => {
  const role = await knex('roles')
    .where({ slug: 'staff', predefined: true })
    .first('id');

  return role?.id ?? null;
};

exports.up = async (knex) => {
  const roleId = await catalogStaffRoleId(knex);

  if (!roleId) return;

  for (const subject of CATALOG_SUBJECTS) {
    for (const ability of CATALOG_ABILITIES) {
      const existing = await knex('role_permissions')
        .where({ role_id: roleId, subject, ability })
        .first('id');

      if (existing) {
        await knex('role_permissions')
          .where({ id: existing.id })
          .update({ value: true });
      } else {
        await knex('role_permissions').insert({
          role_id: roleId,
          subject,
          ability,
          value: true,
        });
      }
    }
  }
};

exports.down = async (knex) => {
  const roleId = await catalogStaffRoleId(knex);

  if (!roleId) return;

  // Убираем ровно то, что добавили: три справочника и три действия.
  await knex('role_permissions')
    .where({ role_id: roleId })
    .whereIn('subject', CATALOG_SUBJECTS)
    .whereIn('ability', CATALOG_ABILITIES)
    .delete();
};
