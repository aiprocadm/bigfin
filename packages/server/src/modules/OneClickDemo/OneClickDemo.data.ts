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

/**
 * Оплаты по счетам (С3 карты v29).
 *
 * Без них демо показывало бизнес, в котором деньги не движутся: пустые
 * «Поступления оплат», нулевой отчёт о движении денег, нули в сводке на
 * главной. Одна оплата полная, вторая частичная — чтобы человек увидел и
 * закрытый счёт, и остаток долга, который продолжает висеть просроченным.
 *
 * Суммы сходятся со счетами из `DEMO_INVOICES`: первый счёт — 31 500
 * (18 000 + 3 × 4 500), второй — 35 000, из них оплачено 20 000.
 */
export const DEMO_PAYMENTS = [
  {
    invoiceIndex: 0,
    customerIndex: 0,
    amount: 31500,
    paidDaysAgo: 5,
    reference: 'п/п 118',
  },
  {
    invoiceIndex: 1,
    customerIndex: 1,
    amount: 20000,
    paidDaysAgo: 20,
    reference: 'п/п 254',
  },
];

/**
 * Расходы демо-организации (С3 карты v29): обычные траты небольшой
 * компании, чтобы в отчёте о движении денег было видно не только «пришло»,
 * но и «ушло». Счета учёта берутся по слагу из плана счетов организации.
 *
 * Всего 31 000 при полученных 51 500 — демо остаётся с деньгами на счету.
 */
export const DEMO_EXPENSES = [
  {
    accountSlug: 'rent',
    amount: 25000,
    paidDaysAgo: 8,
    description: 'Аренда офиса за месяц',
  },
  {
    accountSlug: 'office-expenses',
    amount: 4800,
    paidDaysAgo: 6,
    description: 'Бумага, картриджи, канцелярия',
  },
  {
    accountSlug: 'bank-fees-and-charges',
    amount: 1200,
    paidDaysAgo: 3,
    description: 'Обслуживание расчётного счёта',
  },
];
