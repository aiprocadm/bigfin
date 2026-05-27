export const InitialTaxRates = [
  {
    name: 'Tax Exempt',
    code: 'TAX-EXEMPT',
    description: 'Exempts goods or services from taxes.',
    rate: 0,
    active: 1,
  },
  {
    name: 'Tax on Purchases',
    code: 'TAX-PURCHASES',
    description: 'Fee added to the cost when you buy items.',
    rate: 0,
    active: 1,
  },
  {
    name: 'Tax on Sales',
    code: 'TAX-SALES',
    description: 'Fee added to the cost when you sell items.',
    rate: 0,
    active: 1,
  },
  {
    name: 'Sales Tax on Imports',
    code: 'TAX-IMPORTS',
    description: 'Fee added to the cost when you sale to another country.',
    rate: 0,
    active: 1,
  },
  // --- Российские ставки НДС (Sub-project ②a) ---
  {
    name: 'НДС 20%',
    code: 'VAT_20',
    description: 'Стандартная ставка НДС (РФ)',
    rate: 20,
    active: 1,
  },
  {
    name: 'НДС 10%',
    code: 'VAT_10',
    description: 'Льготная ставка НДС (продукты, лекарства, детские товары)',
    rate: 10,
    active: 1,
  },
  {
    name: 'НДС 0%',
    code: 'VAT_0',
    description: 'Нулевая ставка НДС (экспорт)',
    rate: 0,
    active: 1,
  },
  {
    name: 'Без НДС',
    code: 'VAT_NONE',
    description: 'Без НДС (для УСН/Патент/АУСН/НПД)',
    rate: 0,
    active: 1,
  },
];
