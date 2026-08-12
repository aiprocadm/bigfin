// © 2026 Bigfin
// Право «приложить файл» роли «Сотрудник» у организаций, созданных раньше.
//
// У вложений в схеме прав значились только просмотр и удаление — права на
// «приложить» не было вовсе, поэтому файл прикладывал кто угодно. Теперь
// загрузка и привязка файла к документу спрашивают право «создание», и роль
// «Сотрудник» его получает: приложить договор к счёту — повседневная работа.
//
// Отвязывать и удалять файлы сотруднику по-прежнему нельзя.
//
// Правка добавляющая и идемпотентная: если строка уже есть — просто включается.

// Имя уникально нарочно: миграции — глобальные скрипты без импортов.
const attachStaffRoleId = async (knex) => {
  const role = await knex('roles')
    .where({ slug: 'staff', predefined: true })
    .first('id');

  return role?.id ?? null;
};

exports.up = async (knex) => {
  const roleId = await attachStaffRoleId(knex);

  if (!roleId) return;

  const existing = await knex('role_permissions')
    .where({ role_id: roleId, subject: 'Attachment', ability: 'Create' })
    .first('id');

  if (existing) {
    await knex('role_permissions')
      .where({ id: existing.id })
      .update({ value: true });
  } else {
    await knex('role_permissions').insert({
      role_id: roleId,
      subject: 'Attachment',
      ability: 'Create',
      value: true,
    });
  }
};

exports.down = async (knex) => {
  const roleId = await attachStaffRoleId(knex);

  if (!roleId) return;

  await knex('role_permissions')
    .where({ role_id: roleId, subject: 'Attachment', ability: 'Create' })
    .delete();
};
