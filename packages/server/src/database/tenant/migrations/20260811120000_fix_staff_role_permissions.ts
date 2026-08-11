// © 2026 Bigfin
// Починка прав встроенной роли «Сотрудник» у организаций, созданных раньше.
//
// Права засевались без колонки «включено» (в базе оставался NULL) и с действием
// в нижнем регистре («create»), тогда как код спрашивает «Create». Сборка прав
// отбирает только включённые, а сверка действий регистрозависимая — поэтому
// каждой причины по отдельности хватало, чтобы роль не давала НИЧЕГО.
//
// Правка точная: трогаются только те двадцать четыре строки, которые создала
// заготовка, — по паре «предмет + действие в нижнем регистре». Права, заведённые
// владельцем через интерфейс, приходят с заглавной буквы и с явным «включено»,
// поэтому под правило не попадают.

const SUBJECTS = [
  'SaleInvoice',
  'SaleEstimate',
  'SaleReceipt',
  'PaymentReceive',
  'Bill',
  'PaymentMade',
];

// Как было засеяно → как спрашивает код.
const ABILITIES = {
  create: 'Create',
  delete: 'Delete',
  view: 'View',
  edit: 'Edit',
};

/** Идентификатор встроенной роли «Сотрудник» этой организации. */
const staffRoleId = async (knex) => {
  const role = await knex('roles')
    .where({ slug: 'staff', predefined: true })
    .first('id');

  return role?.id ?? null;
};

exports.up = async (knex) => {
  const roleId = await staffRoleId(knex);

  if (!roleId) return;

  for (const [seeded, canonical] of Object.entries(ABILITIES)) {
    await knex('role_permissions')
      .where({ role_id: roleId, ability: seeded })
      .whereIn('subject', SUBJECTS)
      .update({ ability: canonical, value: true });
  }
};

exports.down = async (knex) => {
  const roleId = await staffRoleId(knex);

  if (!roleId) return;

  for (const [seeded, canonical] of Object.entries(ABILITIES)) {
    await knex('role_permissions')
      .where({ role_id: roleId, ability: canonical })
      .whereIn('subject', SUBJECTS)
      .update({ ability: seeded, value: null });
  }
};
