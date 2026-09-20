// © 2026 Bigfin

/**
 * Отраслевые демо-наборы (FIN-027 ТЗ-2).
 *
 * ЗАЧЕМ. Новый человек видит пустой продукт и не понимает, как он должен
 * выглядеть заполненным. Один общий набор этого не решает: у оптовика и у
 * бухгалтера-одиночки разные статьи, разные контрагенты и разные суммы, и
 * чужой пример не узнаётся как свой.
 *
 * ПОЧЕМУ ТРИ, А НЕ ОДИННАДЦАТЬ. У конкурента их одиннадцать, и это верное
 * направление, но неверный первый шаг: одиннадцать наборов — это одиннадцать
 * наборов, которые надо поддерживать в согласии с изменениями продукта.
 * Начинаем с трёх самых частых случаев, остальные добавляются по спросу.
 *
 * ПОЧЕМУ НАБОРЫ ЛЕЖАТ ЗДЕСЬ, А НЕ В `database/tenant/seeds/data/demo/`.
 * ТЗ называет путь к сидам базы, но демо наполняется НЕ сидами: данные
 * создаются обычными службами продукта (`CreateSaleInvoice`,
 * `CreateBill`, …), чтобы демо прошло те же проверки и получило те же
 * проводки, что настоящая работа. Положить их к сидам значило бы намекнуть
 * на вставку в базу напрямую — то, чего здесь намеренно нет.
 */

/** Отрасль демо-организации. */
export type DemoIndustry = 'services' | 'trade' | 'projects';

/** Все отрасли: по нему проверяется входящее значение. */
export const DEMO_INDUSTRIES: DemoIndustry[] = ['services', 'trade', 'projects'];

/** Отрасль по умолчанию — самый частый случай. */
export const DEFAULT_DEMO_INDUSTRY: DemoIndustry = 'services';

export interface DemoCustomer {
  customerType: string;
  displayName: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
}

export interface DemoVendor {
  displayName: string;
  companyName: string;
  email: string;
  workPhone: string;
}

export interface DemoItem {
  name: string;
  type: 'service' | 'non-inventory';
  code: string;
  sellPrice: number;
  costPrice: number;
  description: string;
}

export interface DemoInvoiceEntry {
  itemIndex: number;
  quantity: number;
  rate: number;
  description: string;
}

export interface DemoInvoice {
  customerIndex: number;
  issuedDaysAgo: number;
  termDays: number;
  delivered: boolean;
  message: string;
  entries: DemoInvoiceEntry[];
}

export interface DemoPayment {
  invoiceIndex: number;
  customerIndex: number;
  amount: number;
  paidDaysAgo: number;
  reference: string;
}

export interface DemoExpense {
  accountSlug: string;
  amount: number;
  paidDaysAgo: number;
  description: string;
}

/**
 * Неоплаченный счёт поставщика с БУДУЩИМ сроком.
 *
 * ЗАЧЕМ ОН НУЖЕН КАЖДОМУ НАБОРУ. Приёмка 2 FIN-027 требует, чтобы в демо
 * был хотя бы один кассовый разрыв в будущем: без него виджет денег и
 * платёжный календарь — главное, что отличает продукт, — показывают
 * ровную линию и не объясняют, зачем они нужны.
 */
export interface DemoBill {
  vendorIndex: number;
  /**
   * Что покупаем.
   *
   * Счёт поставщика заводится обычной службой продукта, а она требует
   * позицию: «просто сумма» в базу не ложится. Берём ту же позицию, что
   * продаём, — так покупка и продажа сходятся в одной статье.
   */
  itemIndex: number;
  /** Через сколько дней платить. Ноль и меньше — уже просрочено. */
  dueInDays: number;
  amount: number;
  billNumber: string;
  note: string;
}

export interface DemoDataset {
  industry: DemoIndustry;
  /** Одна строка «что в наборе» — её показывает карточка выбора. */
  summaryKey: string;
  customers: DemoCustomer[];
  vendors: DemoVendor[];
  items: DemoItem[];
  invoices: DemoInvoice[];
  payments: DemoPayment[];
  expenses: DemoExpense[];
  bills: DemoBill[];
}
