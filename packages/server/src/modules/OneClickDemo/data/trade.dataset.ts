// © 2026 Bigfin
import { DemoDataset } from './demoDataset.types';

/**
 * Оптово-розничная торговля (FIN-027 ТЗ-2).
 *
 * Здесь прибыль живёт в наценке, а деньги — в отсрочках: поставщику платят
 * раньше, чем платит покупатель, и разрыв между этими датами и есть главная
 * боль торговли. Поэтому в наборе крупная закупка с ближним сроком и
 * отгрузки с отсрочкой.
 *
 * Позиции заведены как «не складские»: склад — отдельный разговор, а демо
 * должно собираться за секунды и не спорить с остатками.
 */
export const TRADE_DATASET: DemoDataset = {
  industry: 'trade',
  summaryKey: 'one_click_demo.industry.trade.summary',

  customers: [
    {
      customerType: 'business',
      displayName: 'ООО «Мебель-Град»',
      companyName: 'ООО «Мебель-Град»',
      firstName: 'Олег',
      lastName: 'Титов',
      email: 'mebelgrad@example.ru',
      workPhone: '+7 495 100-11-22',
    },
    {
      customerType: 'business',
      displayName: 'ООО «Хозяин»',
      companyName: 'ООО «Хозяин»',
      firstName: 'Марина',
      lastName: 'Жукова',
      email: 'hozyain@example.ru',
      workPhone: '+7 343 100-33-44',
    },
    {
      customerType: 'business',
      displayName: 'ИП Гарипов Р. Н.',
      companyName: 'ИП Гарипов Р. Н.',
      firstName: 'Рустам',
      lastName: 'Гарипов',
      email: 'garipov@example.ru',
      workPhone: '+7 917 100-55-66',
    },
  ],

  vendors: [
    {
      displayName: 'ООО «Стройторг-Опт»',
      companyName: 'ООО «Стройторг-Опт»',
      email: 'opt@example.ru',
      workPhone: '+7 495 200-11-22',
    },
    {
      displayName: 'ООО «Транслогистик»',
      companyName: 'ООО «Транслогистик»',
      email: 'logistics@example.ru',
      workPhone: '+7 495 200-33-44',
    },
  ],

  items: [
    {
      name: 'Стеллаж металлический 2000×1000',
      type: 'non-inventory',
      code: 'TRD-001',
      sellPrice: 9800,
      costPrice: 6400,
      description: 'Складской стеллаж, четыре полки.',
    },
    {
      name: 'Ящик пластиковый 600×400',
      type: 'non-inventory',
      code: 'TRD-002',
      sellPrice: 720,
      costPrice: 430,
      description: 'Тара для хранения и перевозки.',
    },
    {
      name: 'Тележка складская',
      type: 'non-inventory',
      code: 'TRD-003',
      sellPrice: 14500,
      costPrice: 9700,
      description: 'Грузоподъёмность 300 кг.',
    },
    {
      name: 'Доставка по городу',
      type: 'service',
      code: 'TRD-DLV',
      sellPrice: 2500,
      costPrice: 1600,
      description: 'Доставка заказа в пределах города.',
    },
  ],

  invoices: [
    {
      customerIndex: 0,
      issuedDaysAgo: 12,
      termDays: 14,
      delivered: true,
      message: 'Отгрузка по заявке №118.',
      entries: [
        { itemIndex: 0, quantity: 12, rate: 9800, description: 'Стеллажи' },
        { itemIndex: 3, quantity: 1, rate: 2500, description: 'Доставка' },
      ],
    },
    {
      // Просрочка: в торговле это обычное дело, и человек должен её увидеть.
      customerIndex: 1,
      issuedDaysAgo: 52,
      termDays: 21,
      delivered: true,
      message: 'Просим оплатить отгрузку.',
      entries: [
        { itemIndex: 1, quantity: 200, rate: 720, description: 'Ящики' },
        { itemIndex: 2, quantity: 2, rate: 14500, description: 'Тележки' },
      ],
    },
    {
      customerIndex: 2,
      issuedDaysAgo: 3,
      termDays: 30,
      delivered: true,
      message: '',
      entries: [
        { itemIndex: 1, quantity: 120, rate: 720, description: 'Ящики' },
      ],
    },
  ],

  payments: [
    {
      invoiceIndex: 0,
      customerIndex: 0,
      amount: 120100,
      paidDaysAgo: 4,
      reference: 'п/п 412',
    },
    {
      // Частичная оплата: остаток долга продолжает висеть просроченным.
      invoiceIndex: 1,
      customerIndex: 1,
      amount: 60000,
      paidDaysAgo: 25,
      reference: 'п/п 388',
    },
  ],

  expenses: [
    {
      accountSlug: 'rent',
      amount: 48000,
      paidDaysAgo: 9,
      description: 'Аренда склада за месяц',
    },
    {
      accountSlug: 'office-expenses',
      amount: 7300,
      paidDaysAgo: 5,
      description: 'Упаковка и расходные материалы',
    },
    {
      accountSlug: 'bank-fees-and-charges',
      amount: 2100,
      paidDaysAgo: 2,
      description: 'Обслуживание расчётного счёта и эквайринг',
    },
  ],

  bills: [
    {
      // БУДУЩИЙ РАЗРЫВ. Закупка партии оплачивается раньше, чем покупатели
      // рассчитаются по отсрочке, — классическая беда торговли.
      vendorIndex: 0,
      itemIndex: 0,
      dueInDays: 5,
      amount: 210000,
      billNumber: 'СТО-10442',
      note: 'Закупка партии стеллажей и тары',
    },
    {
      vendorIndex: 1,
      itemIndex: 3,
      dueInDays: 18,
      amount: 34000,
      billNumber: 'ТЛ-7781',
      note: 'Перевозка партии со склада поставщика',
    },
  ],
};
