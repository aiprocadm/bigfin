// © 2026 Bigfin
// Роль «Сотрудник» получает просмотр вложений.
//
// Ручки просмотра вложений объявляли право, но исполнять его было некому —
// проходил кто угодно. Теперь страж подключён, и без этой строки сотрудник
// смог бы приложить договор к счёту, но не смог бы его открыть.
//
// Удаление вложений сотруднику НЕ даётся: убрать чужой файл — действие тяжелее
// повседневного, оно остаётся за владельцем.

const SUBJECT = 'Attachment';
const ABILITY = 'View';

/** Идентификатор встроенной роли «Сотрудник» этой организации. */
const staffRoleIdForAttachments = async (knex) => {
  const role = await knex('roles')
    .where({ slug: 'staff', predefined: true })
    .first('id');

  return role?.id ?? null;
};

exports.up = async (knex) => {
  const roleId = await staffRoleIdForAttachments(knex);

  if (!roleId) return;

  const existing = await knex('role_permissions')
    .where({ role_id: roleId, subject: SUBJECT, ability: ABILITY })
    .first('id');

  // Повторный прогон ничего не задваивает.
  if (existing) return;

  await knex('role_permissions').insert({
    role_id: roleId,
    subject: SUBJECT,
    ability: ABILITY,
    value: true,
  });
};

exports.down = async (knex) => {
  const roleId = await staffRoleIdForAttachments(knex);

  if (!roleId) return;

  await knex('role_permissions')
    .where({ role_id: roleId, subject: SUBJECT, ability: ABILITY })
    .delete();
};
