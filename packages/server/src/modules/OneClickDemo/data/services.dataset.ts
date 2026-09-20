// © 2026 Bigfin
import { DemoDataset } from './demoDataset.types';

/**
 * Услуги — самый частый случай российского малого дела (FIN-027 ТЗ-2).
 *
 * Бухгалтерское сопровождение, консультации, настройка. Товаров нет,
 * склада нет, прибыль складывается из времени людей. Это тот набор, в
 * котором узнаёт себя большинство: агентство, студия, юрист, мастер.
 *
 * Данные вымышленные, но правдоподобные: человек заходит посмотреть
 * продукт, и списки должны выглядеть как его собственные.
 */
export const SERVICES_DATASET: DemoDataset = {
  industry: 'services',
  summaryKey: 'one_click_demo.industry.services.summary',

  customers: [
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
  ],

  vendors: [
    {
      displayName: 'ООО «Деловой центр»',
      companyName: 'ООО «Деловой центр»',
      email: 'arenda@example.ru',
      workPhone: '+7 495 000-77-88',
    },
    {
      displayName: 'ООО «Софт-Лайн»',
      companyName: 'ООО «Софт-Лайн»',
      email: 'soft@example.ru',
      workPhone: '+7 495 000-99-00',
    },
  ],

  items: [
    {
      name: 'Консультация по учёту (час)',
      type: 'service',
      code: 'SRV-001',
      sellPrice: 4500,
      costPrice: 2000,
      description: 'Разбор учёта и ответы на вопросы, один час.',
    },
    {
      name: 'Ведение учёта, месяц',
      type: 'service',
      code: 'SRV-002',
      sellPrice: 18000,
      costPrice: 9000,
      description: 'Ежемесячное ведение управленческого учёта.',
    },
    {
      name: 'Настройка Bigfin под компанию',
      type: 'service',
      code: 'SRV-003',
      sellPrice: 35000,
      costPrice: 15000,
      description: 'Первичная настройка: план счетов, реквизиты, шаблоны.',
    },
  ],

  invoices: [
    {
      customerIndex: 0,
      issuedDaysAgo: 10,
      termDays: 14,
      delivered: true,
      message: 'Спасибо за заказ!',
      entries: [
        { itemIndex: 1, quantity: 1, rate: 18000, description: 'Август' },
        {
          itemIndex: 0,
          quantity: 3,
          rate: 4500,
          description: 'Дополнительные часы',
        },
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
  ],

  payments: [
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
  ],

  expenses: [
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
  ],

  bills: [
    {
      // БУДУЩИЙ РАЗРЫВ. Аренда за квартал приходит раньше, чем клиент
      // оплатит сентябрьский счёт, — и остаток уходит в минус.
      vendorIndex: 0,
      itemIndex: 1,
      dueInDays: 7,
      amount: 75000,
      billNumber: 'АР-0917',
      note: 'Аренда офиса за квартал',
    },
    {
      vendorIndex: 1,
      itemIndex: 2,
      dueInDays: 21,
      amount: 12000,
      billNumber: 'СЛ-2291',
      note: 'Продление лицензий',
    },
  ],
};
