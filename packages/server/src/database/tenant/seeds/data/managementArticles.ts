/**
 * Default RU management-article tree for a new organization.
 * `key` is a local reference used only to resolve parentId during seeding.
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
