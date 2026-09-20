// © 2026 Bigfin

/**
 * Наборы данных для проверок сходимости отчётов (раздел 14.2 ТЗ-2).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЕ НАБОРЫ. Инвариант, проверенный на одном удобном примере,
 * проверен наполовину: половина расхождений в учёте живёт именно там, где
 * данные неудобные — две валюты, отсутствующий курс, операции без статьи.
 *
 * ТРИ НАБОРА, КАК ТРЕБУЕТ ТЗ:
 * — **А**: одно юрлицо, одна валюта, без направлений. Базовая сходимость.
 * — **Б**: два юрлица с внутригрупповыми оборотами, направления, переводы
 *   между своими счетами. Консолидация и исключения.
 * — **В**: две валюты, один курс отсутствует, часть операций без статьи и
 *   без направления. Граничные случаи и «не пересчитано».
 *
 * СУММЫ С КОПЕЙКАМИ — НАМЕРЕННО. Округление ловится только там, где есть
 * что округлять; на круглых тысячах любая ошибка деления прячется.
 *
 * «СЕГОДНЯ» ЗАФИКСИРОВАНО. Иначе спеки про разрывы и прошедшее время меняли
 * бы ответ каждый день и однажды покраснели бы сами, без единой правки кода.
 */

/** Фиксированная «сегодняшняя» дата всех наборов. */
export const FIXED_TODAY = '2026-09-20';

/** Период, за который считаются все отчёты наборов. */
export const FIXTURE_PERIOD = {
  fromDate: '2026-09-01',
  toDate: '2026-09-30',
};

export interface FixtureArticle {
  id: number;
  name: string;
  kind: string;
  parentId: number | null;
  cashflowSection: string | null;
}

export interface FixtureAmount {
  id: number;
  amount: number;
}

export interface FixtureDirection {
  projectId: number | null;
  name: string;
  revenue: number;
  costs: number;
}

export interface FixtureDebtPosition {
  contactId: number;
  receivableNet: number;
  payableNet: number;
}

export interface FixtureEntityTotals {
  legalEntityId: number;
  revenue: number;
  costs: number;
}

export interface ConvergenceFixture {
  key: 'А' | 'Б' | 'В';
  title: string;
  articles: FixtureArticle[];
  amounts: FixtureAmount[];
  openingBalance: number;
  closingBalance: number;
  transfers: { incoming: number; outgoing: number };
  /** Обороты по направлениям, включая «без направления» (`projectId: null`). */
  directions: FixtureDirection[];
  /** Сальдо расчётов по контрагентам. */
  debts: FixtureDebtPosition[];
  /** Обороты по юрлицам и внутригрупповая часть между ними. */
  entities: FixtureEntityTotals[];
  intercompanyRevenue: number;
}

/** Общее дерево статей: у всех наборов одно и то же, различаются суммы. */
const ARTICLES: FixtureArticle[] = [
  { id: 1, name: 'Доходы', kind: 'income', parentId: null, cashflowSection: 'operating' },
  { id: 2, name: 'Выручка', kind: 'income', parentId: 1, cashflowSection: 'operating' },
  { id: 3, name: 'Расходы', kind: 'expense', parentId: null, cashflowSection: 'operating' },
  { id: 4, name: 'Аренда', kind: 'expense', parentId: 3, cashflowSection: 'operating' },
  { id: 5, name: 'Оборудование', kind: 'asset', parentId: null, cashflowSection: 'investing' },
  { id: 6, name: 'Кредиты', kind: 'liability', parentId: null, cashflowSection: 'financing' },
];

/**
 * НАБОР А — одно юрлицо, одна валюта, без направлений.
 *
 * Приток 120 300,55, отток 45 100,25 и 30 000,10 на оборудование:
 * поток 45 200,20, и остаток обязан сойтись именно на нём.
 */
export const FIXTURE_A: ConvergenceFixture = {
  key: 'А',
  title: 'одно юрлицо, одна валюта, без направлений',
  articles: ARTICLES,
  // Свёртка уже поднимает суммы детей в родителя — как в проекте.
  amounts: [
    { id: 1, amount: 120_300.55 },
    { id: 2, amount: 120_300.55 },
    { id: 3, amount: 45_100.25 },
    { id: 4, amount: 45_100.25 },
    { id: 5, amount: 30_000.1 },
  ],
  // 120 300,55 − 45 100,25 − 30 000,10 = 45 200,20 — на столько и обязан
  // измениться остаток. «Не разнесено» здесь ноль: все деньги при статьях.
  openingBalance: 200_000.33,
  closingBalance: 245_200.53,
  transfers: { incoming: 0, outgoing: 0 },
  directions: [
    { projectId: null, name: '', revenue: 120_300.55, costs: 75_100.35 },
  ],
  debts: [{ contactId: 1, receivableNet: 88_400.15, payableNet: 12_000.05 }],
  entities: [{ legalEntityId: 1, revenue: 120_300.55, costs: 75_100.35 }],
  intercompanyRevenue: 0,
};

/**
 * НАБОР Б — два юрлица, внутригрупповые обороты, направления, переводы.
 *
 * Переводы между своими счетами есть и обязаны схлопываться в ноль:
 * перевод со своего счёта на свой денег бизнесу не прибавляет.
 */
export const FIXTURE_B: ConvergenceFixture = {
  key: 'Б',
  title: 'два юрлица, внутригрупповые обороты, направления, переводы',
  articles: ARTICLES,
  amounts: [
    { id: 1, amount: 640_800.75 },
    { id: 2, amount: 640_800.75 },
    { id: 3, amount: 210_400.25 },
    { id: 4, amount: 210_400.25 },
    { id: 6, amount: 90_000.5 },
  ],
  // 640 800,75 − 210 400,25 + 90 000,50 = 520 401,00.
  openingBalance: 1_000_000.0,
  closingBalance: 1_520_401.0,
  // Перевод внутри группы: 150 000,40 ушли с одного своего счёта и пришли
  // на другой. В итог не входят и обязаны схлопнуться.
  transfers: { incoming: 150_000.4, outgoing: 150_000.4 },
  directions: [
    { projectId: 10, name: 'Розница', revenue: 400_500.5, costs: 180_200.15 },
    { projectId: 11, name: 'Опт', revenue: 200_300.25, costs: 120_200.1 },
    // Часть оборотов направления не имеет — это норма, и их нельзя терять.
    { projectId: null, name: '', revenue: 40_000.0, costs: 10_000.0 },
  ],
  debts: [
    { contactId: 1, receivableNet: 300_000.4, payableNet: 0 },
    { contactId: 2, receivableNet: -80_000.2, payableNet: 45_000.1 },
  ],
  entities: [
    { legalEntityId: 1, revenue: 500_800.5, costs: 220_400.2 },
    { legalEntityId: 2, revenue: 260_000.25, costs: 90_000.05 },
  ],
  // Одно юрлицо продало другому: в сводном отчёте эта выручка исключается.
  intercompanyRevenue: 120_000.0,
};

/**
 * НАБОР В — две валюты, один курс отсутствует, операции без статьи.
 *
 * «Не разнесено по статьям» здесь не ноль НАМЕРЕННО: именно такие данные и
 * ломают сходимость, если её считать по статьям, а не по деньгам.
 */
export const FIXTURE_C: ConvergenceFixture = {
  key: 'В',
  title: 'две валюты, курс отсутствует, операции без статьи и направления',
  articles: ARTICLES,
  amounts: [
    { id: 1, amount: 75_000.99 },
    { id: 2, amount: 75_000.99 },
    { id: 3, amount: 30_000.01 },
    { id: 4, amount: 30_000.01 },
  ],
  // По статьям 45 000,98, а денег прибавилось 57 501,23: разницу
  // 12 500,25 принесли счета, не привязанные ни к одной статье. Именно
  // такие данные и ломают сходимость, если считать её по статьям.
  openingBalance: 50_000.5,
  closingBalance: 107_501.73,
  transfers: { incoming: 20_000.25, outgoing: 20_000.25 },
  directions: [
    { projectId: 20, name: 'Экспорт', revenue: 75_000.99, costs: 30_000.01 },
    { projectId: null, name: '', revenue: 0, costs: 0 },
  ],
  debts: [
    { contactId: 5, receivableNet: 0, payableNet: -33_000.33 },
    { contactId: 6, receivableNet: 0, payableNet: 0 },
  ],
  entities: [{ legalEntityId: 1, revenue: 75_000.99, costs: 30_000.01 }],
  intercompanyRevenue: 0,
};

export const CONVERGENCE_FIXTURES: ConvergenceFixture[] = [
  FIXTURE_A,
  FIXTURE_B,
  FIXTURE_C,
];

/**
 * Допуск сходимости из ТЗ (раздел 14.2).
 *
 * Расхождение больше — падение теста, а не предупреждение. Меньше —
 * проверяется тоже: инвариант «ровно ноль» сравнивается с нулём точно.
 */
export const CONVERGENCE_TOLERANCE = 0.005;
