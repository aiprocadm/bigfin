import * as moment from 'moment';
import { TaxRegime } from '@/modules/RussianLegalAttributes/constants';

/**
 * Ставки налога по режимам — базовые, федеральные.
 *
 * Регионы вправе снижать их (УСН «Доходы» — до 1 %, «Доходы минус расходы» —
 * до 5 %), поэтому это именно оценка. Возможность поставить свою ставку —
 * следующий срез карты (Н3б).
 */
export const TAX_RATE_BY_REGIME: Partial<Record<TaxRegime, number>> = {
  [TaxRegime.USN_INCOME]: 6,
  [TaxRegime.USN_INCOME_EXPENSE]: 15,
  [TaxRegime.AUSN]: 8,
};

/** Режимы, где налог считается от разницы доходов и расходов. */
const EXPENSE_BASED: TaxRegime[] = [TaxRegime.USN_INCOME_EXPENSE];

export interface SimplifiedTaxEstimate {
  /** Сумма налога к уплате за период. */
  amount: number;
  /** Ставка, по которой считали, в процентах. */
  ratePercent: number;
  /** База: доход или доход минус расходы. */
  base: number;
  /** Начало и конец периода (квартала) в формате YYYY-MM-DD. */
  fromDate: string;
  toDate: string;
  /** Срок уплаты авансового платежа. */
  dueDate: string;
}

/**
 * Н3 карты v22. Оценка налога на упрощёнке за текущий квартал.
 *
 * Зачем. Для малого бизнеса это самый крупный и самый пугающий платёж
 * квартала. Продукт знает доходы (кассовым методом) и налоговый режим — и
 * при этом молчит, а человек идёт считать в блокнот и узнаёт сумму тогда,
 * когда денег уже нет.
 *
 * Это ОЦЕНКА, а не бухгалтерский расчёт. Не учитываются страховые взносы,
 * которые уменьшают налог, минимальный налог 1 % на «Доходах минус
 * расходах», убытки прошлых лет и региональные льготные ставки. Так и
 * подписано в интерфейсе.
 *
 * Сроки: авансовый платёж по упрощёнке платится до 28-го числа месяца,
 * следующего за кварталом (НК РФ в редакции с 2023 года). За IV квартал
 * платят уже налог по итогам года — организации до 28 марта, ИП до
 * 28 апреля; здесь берём 28 марта как ближайший срок, разницу для ИП
 * покажем, когда продукт будет знать юрформу (срез Н6).
 */
export const estimateSimplifiedTax = (params: {
  regime: string | null | undefined;
  /** Доход за период, кассовым методом. */
  income: number;
  /** Расход за период — нужен только режиму «Доходы минус расходы». */
  expenses: number;
  /** Сегодняшняя дата (передаём, чтобы тесты не зависели от календаря). */
  today: string;
}): SimplifiedTaxEstimate | null => {
  const { regime, income, expenses, today } = params;
  const ratePercent = TAX_RATE_BY_REGIME[regime as TaxRegime];

  // Общая система и патент сюда не попадают: на патенте налог не зависит от
  // выручки вовсе, а на общей системе это отдельная большая тема (НДС плюс
  // налог на прибыль). Обещать оценку там, где она была бы выдумкой, нельзя.
  if (!ratePercent) return null;

  const day = moment(today, 'YYYY-MM-DD', true);
  if (!day.isValid()) return null;

  const quarterStart = day.clone().startOf('quarter');
  const quarterEnd = day.clone().endOf('quarter');

  const base = EXPENSE_BASED.includes(regime as TaxRegime)
    ? income - expenses
    : income;

  // Отрицательная база — это не отрицательный налог, а ноль к уплате.
  const amount = base > 0 ? (base * ratePercent) / 100 : 0;

  return {
    amount: Math.round(amount * 100) / 100,
    ratePercent,
    base: Math.round(base * 100) / 100,
    fromDate: quarterStart.format('YYYY-MM-DD'),
    toDate: quarterEnd.format('YYYY-MM-DD'),
    dueDate: dueDateForQuarter(quarterEnd),
  };
};

/**
 * Срок уплаты за квартал: 28-е число следующего месяца, а за IV квартал —
 * 28 марта следующего года (годовой расчёт).
 */
const dueDateForQuarter = (quarterEnd: moment.Moment): string => {
  const isLastQuarter = quarterEnd.quarter() === 4;

  return isLastQuarter
    ? quarterEnd.clone().add(1, 'year').startOf('year').month(2).date(28)
        .format('YYYY-MM-DD')
    : quarterEnd.clone().add(1, 'month').startOf('month').date(28)
        .format('YYYY-MM-DD');
};
