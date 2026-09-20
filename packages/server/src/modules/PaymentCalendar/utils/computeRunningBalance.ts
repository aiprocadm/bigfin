import {
  CashGap,
  CashGapInterval,
  DayBalance,
  DayFlow,
  ForecastResult,
} from '../PaymentCalendar.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Копилка одного разрыва, пока он ещё не закончился.
 *
 * Первый день и его номер держатся отдельно от `CashGapInterval`: наружу они
 * не нужны, но из них собирается прежнее поле `gap`, и пересчитывать его
 * заново значило бы завести второй ответ на один вопрос.
 */
interface OpenGap extends CashGapInterval {
  /** Нехватка в ПЕРВЫЙ день ямы — не путать с глубиной дна. */
  firstAmount: number;
  /** Номер первого дня ямы от начала горизонта. */
  firstIndex: number;
}

/**
 * Считает остаток на конец каждого дня и находит ВСЕ кассовые разрывы.
 *
 * ПОЧЕМУ РАЗРЫВОВ МНОГО. Раньше отсюда возвращался один день — тот, в который
 * остаток впервые ушёл в минус. Этого хватало на вердикт «денег не хватит
 * такого-то числа» и не хватало больше ни на что: ни назвать глубину ямы, ни
 * сказать, когда она кончится, ни предупредить о второй.
 *
 * ПОЧЕМУ ГЛУБИНА, А НЕ ПЕРВЫЙ ДЕНЬ. Занимают не на первый день ямы, а на её
 * дно: в первый день не хватает, скажем, тридцати тысяч, а через неделю —
 * трёхсот. Заняв тридцать, владелец повторил бы ту же беду неделей позже.
 *
 * ПОЧЕМУ `to` МОЖЕТ БЫТЬ `null`. Яма, которая не кончилась до конца горизонта,
 * и яма, которая кончилась в последний день, — разные ответы. Первый означает
 * «дальше мы не смотрели, и выхода пока не видно», и подменять его последней
 * датой горизонта было бы прямой неправдой.
 *
 * @param {number} openingBalance остаток на начало (в базовой валюте)
 * @param {DayFlow[]} flows чистые суммы по дням, по возрастанию даты
 * @returns {ForecastResult}
 */
export function computeRunningBalance(
  openingBalance: number,
  flows: DayFlow[],
): ForecastResult {
  let balance = round3(openingBalance);
  const days: DayBalance[] = [];
  const open: OpenGap[] = [];
  let current: OpenGap | null = null;

  flows.forEach((flow, index) => {
    balance = round3(balance + flow.inflow - flow.outflow);
    days.push({ ...flow, balance });

    if (balance < 0) {
      const shortage = round3(Math.abs(balance));

      if (current === null) {
        current = {
          from: flow.date,
          to: null,
          deepestAmount: shortage,
          deepestDate: flow.date,
          firstAmount: shortage,
          firstIndex: index,
        };
        open.push(current);
      } else if (shortage > current.deepestAmount) {
        // Строго «больше», а не «больше или равно»: при двух одинаково
        // глубоких днях дном считается первый — о нём и предупреждают.
        current.deepestAmount = shortage;
        current.deepestDate = flow.date;
      }

      return;
    }

    // Ноль — это уже НЕ разрыв: денег ровно хватило. Яма закрывается
    // предыдущим днём, а не сегодняшним.
    if (current !== null) {
      current.to = flows[index - 1].date;
      current = null;
    }
  });

  const gaps: CashGapInterval[] = open.map(
    ({ from, to, deepestAmount, deepestDate }) => ({
      from,
      to,
      deepestAmount,
      deepestDate,
    }),
  );

  // Прежнее поле выводится из первой ямы, а не считается заново: так вердикт
  // на главной и список разрывов не могут разойтись между собой.
  const gap: CashGap | null =
    open.length === 0
      ? null
      : {
          date: open[0].from,
          amount: open[0].firstAmount,
          daysFromStart: open[0].firstIndex,
        };

  return { days, gap, gaps };
}
