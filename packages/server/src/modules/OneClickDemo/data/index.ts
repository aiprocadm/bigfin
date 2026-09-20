// © 2026 Bigfin
import {
  DEFAULT_DEMO_INDUSTRY,
  DEMO_INDUSTRIES,
  DemoDataset,
  DemoIndustry,
} from './demoDataset.types';
import { SERVICES_DATASET } from './services.dataset';
import { TRADE_DATASET } from './trade.dataset';
import { PROJECTS_DATASET } from './projects.dataset';

export * from './demoDataset.types';
export { SERVICES_DATASET, TRADE_DATASET, PROJECTS_DATASET };

/** Все наборы по отраслям. */
export const DEMO_DATASETS: Record<DemoIndustry, DemoDataset> = {
  services: SERVICES_DATASET,
  trade: TRADE_DATASET,
  projects: PROJECTS_DATASET,
};

/**
 * Приводит значение из запроса к отрасли.
 *
 * Чужое значение — это НЕ ошибка и НЕ пустое демо: человек нажал кнопку
 * «посмотреть продукт», и уронить его запрос из-за опечатки в адресе
 * значило бы потерять его совсем. Берём самый частый случай.
 *
 * @param {string} [value] значение из запроса
 * @returns {DemoIndustry}
 */
export function parseDemoIndustry(value?: string): DemoIndustry {
  return DEMO_INDUSTRIES.includes(value as DemoIndustry)
    ? (value as DemoIndustry)
    : DEFAULT_DEMO_INDUSTRY;
}

/**
 * Набор данных по отрасли.
 *
 * @param {string} [industry] отрасль
 * @returns {DemoDataset}
 */
export function datasetForIndustry(industry?: string): DemoDataset {
  return DEMO_DATASETS[parseDemoIndustry(industry)];
}

/** Точка денежного ряда: день и остаток на конец дня. */
export interface DemoBalancePoint {
  /** Через сколько дней от сегодня. Отрицательное — в прошлом. */
  dayOffset: number;
  balance: number;
}

export interface DemoMoneyProjection {
  /** Остаток на сегодня: всё, что уже пришло и ушло. */
  today: number;
  /** Ряд остатков вперёд, по дням событий. */
  timeline: DemoBalancePoint[];
  /** Самая глубокая просадка вперёд; `null` — разрыва нет. */
  gap: DemoBalancePoint | null;
}

/**
 * Куда пойдут деньги демо-организации.
 *
 * ЗАЧЕМ ЭТО ЕСТЬ. Приёмка 2 FIN-027 требует, чтобы в каждом наборе был
 * кассовый разрыв в будущем. Проверить это на живой базе значит поднять
 * базу, очередь и построить организацию; здесь то же самое считается по
 * самим данным — и спека ловит поломку набора в момент правки, а не через
 * неделю на стенде.
 *
 * ПРАВИЛА ПОВТОРЯЮТ ПЛАТЁЖНЫЙ КАЛЕНДАРЬ: к остатку на счетах прибавляются
 * ожидаемые поступления по неоплаченным счетам покупателям и вычитаются
 * выплаты по неоплаченным счетам поставщиков, каждая в свой день.
 *
 * @param {DemoDataset} dataset набор
 * @returns {DemoMoneyProjection}
 */
export function projectDemoMoney(dataset: DemoDataset): DemoMoneyProjection {
  const received = dataset.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const spent = dataset.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const today = received - spent;

  // Ожидаемые поступления: неоплаченный остаток каждого счёта в день срока.
  const events: DemoBalancePoint[] = [];

  dataset.invoices.forEach((invoice, index) => {
    const total = invoice.entries.reduce(
      (sum, entry) => sum + entry.quantity * entry.rate,
      0,
    );
    const paid = dataset.payments
      .filter((payment) => payment.invoiceIndex === index)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = total - paid;
    if (outstanding <= 0) return;

    // ПРОСРОЧЕННОЕ НЕ СЧИТАЕТСЯ БУДУЩИМ ПОСТУПЛЕНИЕМ. Срок прошёл, а денег
    // нет: обещать их себе вперёд значит закрыть разрыв деньгами, которых
    // человек как раз и не может получить. Календарь смотрит вперёд от
    // сегодня, и такие счета в его окно не попадают.
    const dueInDays = invoice.termDays - invoice.issuedDaysAgo;
    if (dueInDays <= 0) return;

    events.push({ dayOffset: dueInDays, balance: outstanding });
  });

  dataset.bills.forEach((bill) => {
    // По той же причине: просроченный счёт поставщика — это долг сегодня,
    // а не выплата завтра.
    if (bill.dueInDays <= 0) return;

    events.push({ dayOffset: bill.dueInDays, balance: -bill.amount });
  });

  events.sort((left, right) => left.dayOffset - right.dayOffset);

  let running = today;
  const timeline: DemoBalancePoint[] = [];

  events.forEach((event) => {
    running += event.balance;
    timeline.push({ dayOffset: event.dayOffset, balance: running });
  });

  const gap = timeline.reduce<DemoBalancePoint | null>(
    (deepest, point) =>
      point.balance < 0 && (!deepest || point.balance < deepest.balance)
        ? point
        : deepest,
    null,
  );

  return { today, timeline, gap };
}
