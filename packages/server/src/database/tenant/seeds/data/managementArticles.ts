/**
 * Дерево статей управленческого учёта, с которым организация начинает жить.
 *
 * `key` — УСТОЙЧИВЫЙ КЛЮЧ системной статьи. Он решает две задачи:
 *
 * 1. Внутри сида по нему находится родитель (`parent`).
 * 2. Он СОХРАНЯЕТСЯ в базу (колонка `seed_key`), и по нему догоняющая
 *    миграция понимает, что статья уже заведена. Проверять по ИМЕНИ нельзя:
 *    имя системной статьи разрешено менять, и после переименования миграция
 *    завела бы дубль.
 *
 * Ключ не переименовывать никогда. Имя — сколько угодно.
 */
export const ManagementArticlesData = [
  { key: 'income', name: 'Доходы', parent: null, kind: 'income', cashflow_section: 'operating', sort_order: 1 },
  { key: 'revenue', name: 'Выручка', parent: 'income', kind: 'income', cashflow_section: 'operating', sort_order: 1 },

  { key: 'expense', name: 'Расходы', parent: null, kind: 'expense', cashflow_section: 'operating', sort_order: 2 },
  { key: 'cogs', name: 'Себестоимость', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 1 },
  { key: 'rent', name: 'Аренда', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 2 },
  { key: 'payroll', name: 'ФОТ', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 3 },
  { key: 'marketing', name: 'Маркетинг', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 4 },
  { key: 'taxes', name: 'Налоги', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 5 },
  { key: 'other', name: 'Прочее', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 6 },
];

/**
 * Балансовые статьи (этап 17 ТЗ-2, FIN-001).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ СПИСКОМ. Ровно эти статьи догоняющая миграция добавляет
 * организациям, которые завелись ДО пяти видов. Новая организация получает
 * их тем же списком через общий сид — так два пути не расходятся.
 *
 * ПОЧЕМУ ИМЕННО ЭТИ. Это те движения денег, которые не являются ни доходом,
 * ни расходом и потому раньше разметке не поддавались вовсе: кредиты,
 * основные средства, займы и деньги собственника. У каждой обязателен
 * раздел движения денег — без него статья не попала бы ни в один отчёт.
 *
 * РАЗДЕЛЫ. Кредиты, займы и деньги собственника — финансовая деятельность:
 * это про то, откуда взялись деньги, а не про то, чем занимается бизнес.
 * Основные средства — инвестиционная: покупка станка не расход месяца, а
 * вложение, которое будет работать годами.
 */
export const BalanceManagementArticlesData = [
  { key: 'assets', name: 'Активы', parent: null, kind: 'asset', cashflow_section: 'investing', sort_order: 3 },
  { key: 'fixed_assets_purchase', name: 'Покупка основных средств', parent: 'assets', kind: 'asset', cashflow_section: 'investing', sort_order: 1 },
  { key: 'fixed_assets_sale', name: 'Продажа основных средств', parent: 'assets', kind: 'asset', cashflow_section: 'investing', sort_order: 2 },
  { key: 'loans_issued', name: 'Выданные займы', parent: 'assets', kind: 'asset', cashflow_section: 'investing', sort_order: 3 },

  { key: 'liabilities', name: 'Обязательства', parent: null, kind: 'liability', cashflow_section: 'financing', sort_order: 4 },
  { key: 'loan_received', name: 'Получение кредита', parent: 'liabilities', kind: 'liability', cashflow_section: 'financing', sort_order: 1 },
  { key: 'loan_repayment', name: 'Погашение кредита', parent: 'liabilities', kind: 'liability', cashflow_section: 'financing', sort_order: 2 },
  { key: 'loans_received', name: 'Полученные займы', parent: 'liabilities', kind: 'liability', cashflow_section: 'financing', sort_order: 3 },

  { key: 'equity', name: 'Капитал', parent: null, kind: 'equity', cashflow_section: 'financing', sort_order: 5 },
  { key: 'owner_contribution', name: 'Взнос собственника', parent: 'equity', kind: 'equity', cashflow_section: 'financing', sort_order: 1 },
  { key: 'owner_withdrawal', name: 'Изъятие собственника', parent: 'equity', kind: 'equity', cashflow_section: 'financing', sort_order: 2 },
];

/** Полное дерево новой организации: доходы и расходы плюс балансовые виды. */
export const AllManagementArticlesData = [
  ...ManagementArticlesData,
  ...BalanceManagementArticlesData,
];
