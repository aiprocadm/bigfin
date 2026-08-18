/**
 * Налоговая ставка — мета ресурса (С3 карты v14).
 * До этого экспорт ставок отвечал 500: модель без меты и getMeta.
 */
export const TaxRateMeta = {
  defaultFilterField: 'name',
  defaultSort: {
    sortOrder: 'DESC',
    sortField: 'name',
  },
  exportable: true,
  print: {
    pageTitle: 'Tax Rates',
  },
  columns: {
    name: {
      name: 'tax_rate.label.name',
      type: 'text',
    },
    code: {
      name: 'tax_rate.label.code',
      type: 'text',
    },
    rate: {
      name: 'tax_rate.label.rate',
      type: 'number',
    },
    description: {
      name: 'tax_rate.label.description',
      type: 'text',
    },
    active: {
      name: 'tax_rate.label.active',
      type: 'boolean',
    },
  },
};
