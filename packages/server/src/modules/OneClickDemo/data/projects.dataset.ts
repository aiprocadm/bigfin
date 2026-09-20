// © 2026 Bigfin
import { DemoDataset } from './demoDataset.types';

/**
 * Строительство и проектная работа (FIN-027 ТЗ-2).
 *
 * Здесь всё держится на одном вопросе: прибылен ли конкретный объект.
 * Деньги приходят авансами и этапами, расходы идут постоянно, а понять,
 * заработал ли ты на объекте, можно только когда он закрыт. Поэтому в
 * наборе крупные суммы, длинные отсрочки и расчёт с подрядчиком, который
 * ждать не будет.
 */
export const PROJECTS_DATASET: DemoDataset = {
  industry: 'projects',
  summaryKey: 'one_click_demo.industry.projects.summary',

  customers: [
    {
      customerType: 'business',
      displayName: 'ООО «Инвестстрой»',
      companyName: 'ООО «Инвестстрой»',
      firstName: 'Сергей',
      lastName: 'Данилов',
      email: 'investstroy@example.ru',
      workPhone: '+7 495 300-11-22',
    },
    {
      customerType: 'business',
      displayName: 'ТСЖ «Ленина, 14»',
      companyName: 'ТСЖ «Ленина, 14»',
      firstName: 'Галина',
      lastName: 'Ефимова',
      email: 'tsj14@example.ru',
      workPhone: '+7 812 300-33-44',
    },
    {
      customerType: 'business',
      displayName: 'ИП Верещагин Д. П.',
      companyName: 'ИП Верещагин Д. П.',
      firstName: 'Дмитрий',
      lastName: 'Верещагин',
      email: 'vereshagin@example.ru',
      workPhone: '+7 921 300-55-66',
    },
  ],

  vendors: [
    {
      displayName: 'ООО «СтройПодряд»',
      companyName: 'ООО «СтройПодряд»',
      email: 'podryad@example.ru',
      workPhone: '+7 495 400-11-22',
    },
    {
      displayName: 'ООО «БазаМатериалов»',
      companyName: 'ООО «БазаМатериалов»',
      email: 'materials@example.ru',
      workPhone: '+7 495 400-33-44',
    },
  ],

  items: [
    {
      name: 'Проектирование, этап',
      type: 'service',
      code: 'PRJ-001',
      sellPrice: 180000,
      costPrice: 90000,
      description: 'Разработка раздела проекта, один этап.',
    },
    {
      name: 'Отделочные работы, м²',
      type: 'service',
      code: 'PRJ-002',
      sellPrice: 4200,
      costPrice: 2600,
      description: 'Отделка помещения, цена за квадратный метр.',
    },
    {
      name: 'Авторский надзор, месяц',
      type: 'service',
      code: 'PRJ-003',
      sellPrice: 65000,
      costPrice: 30000,
      description: 'Сопровождение объекта, один месяц.',
    },
  ],

  invoices: [
    {
      customerIndex: 0,
      issuedDaysAgo: 20,
      termDays: 10,
      delivered: true,
      message: 'Первый этап по договору.',
      entries: [
        { itemIndex: 0, quantity: 1, rate: 180000, description: 'Этап 1' },
      ],
    },
    {
      // Просроченный этап: в проектах это самая частая причина разрыва.
      customerIndex: 1,
      issuedDaysAgo: 60,
      termDays: 20,
      delivered: true,
      message: 'Просим закрыть задолженность по этапу.',
      entries: [
        {
          itemIndex: 1,
          quantity: 140,
          rate: 4200,
          description: 'Отделка, 140 м²',
        },
      ],
    },
    {
      customerIndex: 2,
      issuedDaysAgo: 4,
      termDays: 30,
      delivered: false,
      message: '',
      entries: [
        { itemIndex: 2, quantity: 1, rate: 65000, description: 'Сентябрь' },
      ],
    },
  ],

  payments: [
    {
      invoiceIndex: 0,
      customerIndex: 0,
      amount: 180000,
      paidDaysAgo: 12,
      reference: 'п/п 77',
    },
    {
      invoiceIndex: 1,
      customerIndex: 1,
      amount: 300000,
      paidDaysAgo: 30,
      reference: 'п/п 91',
    },
  ],

  expenses: [
    {
      accountSlug: 'rent',
      amount: 35000,
      paidDaysAgo: 10,
      description: 'Аренда бытовки и склада на объекте',
    },
    {
      accountSlug: 'other-expenses',
      amount: 62000,
      paidDaysAgo: 7,
      description: 'Материалы по мелким закупкам',
    },
    {
      accountSlug: 'bank-fees-and-charges',
      amount: 3400,
      paidDaysAgo: 3,
      description: 'Обслуживание счёта и переводы',
    },
  ],

  bills: [
    {
      // БУДУЩИЙ РАЗРЫВ. Подрядчику платят по закрытому этапу, а заказчик
      // рассчитывается позже: между этими датами денег на счету нет.
      vendorIndex: 0,
      itemIndex: 1,
      dueInDays: 9,
      amount: 420000,
      billNumber: 'СП-3311',
      note: 'Расчёт с подрядчиком за закрытый этап',
    },
    {
      vendorIndex: 1,
      itemIndex: 0,
      dueInDays: 24,
      amount: 88000,
      billNumber: 'БМ-5520',
      note: 'Материалы на следующий этап',
    },
  ],
};
