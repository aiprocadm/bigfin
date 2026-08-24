/**
 * Содержимое демо-организации (Д2 карты v18).
 *
 * Данные русские и правдоподобные для российского малого бизнеса: человек
 * заходит «посмотреть продукт», и списки должны выглядеть как его
 * собственные, а не как чужая англоязычная выдумка. Названия вымышленные.
 */
export const DEMO_CUSTOMERS = [
  {
    customerType: 'business',
    displayName: 'ООО «Ромашка»',
    companyName: 'ООО «Ромашка»',
    firstName: 'Ирина',
    lastName: 'Соколова',
    email: 'romashka@example.ru',
    workPhone: '+7 495 000-11-22',
  },
  {
    customerType: 'business',
    displayName: 'ООО «Северный ветер»',
    companyName: 'ООО «Северный ветер»',
    firstName: 'Павел',
    lastName: 'Кузнецов',
    email: 'sevveter@example.ru',
    workPhone: '+7 812 000-33-44',
  },
  {
    customerType: 'business',
    displayName: 'ИП Матвеева А. С.',
    companyName: 'ИП Матвеева А. С.',
    firstName: 'Анна',
    lastName: 'Матвеева',
    email: 'matveeva@example.ru',
    workPhone: '+7 903 000-55-66',
  },
];

export const DEMO_ITEMS = [
  {
    name: 'Консультация по учёту (час)',
    type: 'service' as const,
    code: 'SRV-001',
    sellPrice: 4500,
    costPrice: 2000,
    description: 'Разбор учёта и ответы на вопросы, один час.',
  },
  {
    name: 'Ведение учёта, месяц',
    type: 'service' as const,
    code: 'SRV-002',
    sellPrice: 18000,
    costPrice: 9000,
    description: 'Ежемесячное ведение управленческого учёта.',
  },
  {
    name: 'Настройка Bigfin под компанию',
    type: 'service' as const,
    code: 'SRV-003',
    sellPrice: 35000,
    costPrice: 15000,
    description: 'Первичная настройка: план счетов, реквизиты, шаблоны.',
  },
];

export const DEMO_INVOICES = [
  {
    customerIndex: 0,
    issuedDaysAgo: 10,
    termDays: 14,
    delivered: true,
    message: 'Спасибо за заказ!',
    entries: [
      { itemIndex: 1, quantity: 1, rate: 18000, description: 'Август' },
      { itemIndex: 0, quantity: 3, rate: 4500, description: 'Дополнительные часы' },
    ],
  },
  {
    // Просроченный намеренно: в списках должно быть видно оба состояния.
    customerIndex: 1,
    issuedDaysAgo: 45,
    termDays: 14,
    delivered: true,
    message: 'Просим оплатить в срок.',
    entries: [
      { itemIndex: 2, quantity: 1, rate: 35000, description: 'Настройка' },
    ],
  },
  {
    customerIndex: 2,
    issuedDaysAgo: 2,
    termDays: 30,
    delivered: false,
    message: '',
    entries: [
      { itemIndex: 1, quantity: 1, rate: 18000, description: 'Сентябрь' },
    ],
  },
];
