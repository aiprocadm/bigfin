// © 2026 Bigfin
import {
  aggregateForecast,
  isWeekend,
  periodKeyOf,
} from './aggregateForecast';

/**
 * Укрупнение платёжного календаря (FIN-019 ТЗ-2).
 *
 * Главная ловушка здесь — сложить остатки. Поступления и выплаты за месяц
 * складываются, а остаток — нет: это состояние на конец, а не поток.
 * Сложенный остаток выглядит как число и им не является.
 */
const TODAY = '2026-09-20';

const day = (date: string, inflow: number, outflow: number, balance: number) =>
  ({ date, inflow, outflow, balance }) as any;

describe('укрупнение прогноза', () => {
  describe('ключ периода', () => {
    it('день, неделя, месяц, квартал, год', () => {
      expect(periodKeyOf('2026-09-20', 'day')).toBe('2026-09-20');
      expect(periodKeyOf('2026-09-20', 'month')).toBe('2026-09');
      expect(periodKeyOf('2026-09-20', 'quarter')).toBe('2026-Q3');
      expect(periodKeyOf('2026-09-20', 'year')).toBe('2026');
    });

    it('неделя начинается с ПОНЕДЕЛЬНИКА, а не с воскресенья', () => {
      // В JS воскресенье — нулевой день; в России неделя начинается с
      // понедельника, и «неделя» в отчёте обязана совпадать с тем, как её
      // считает человек.
      expect(periodKeyOf('2026-09-20', 'week')).toBe('2026-09-14');
      expect(periodKeyOf('2026-09-14', 'week')).toBe('2026-09-14');
    });
  });

  describe('СУММА ДНЕЙ РАВНА ПЕРИОДУ', () => {
    const days = [
      day('2026-09-01', 100, 40, 60),
      day('2026-09-02', 200, 50, 210),
      day('2026-09-03', 0, 10, 200),
    ];

    it('поступления и выплаты складываются', () => {
      const [month] = aggregateForecast(days, 'month', TODAY);

      expect(month.inflow).toBe(300);
      expect(month.outflow).toBe(100);
    });

    it('ОСТАТОК НЕ СКЛАДЫВАЕТСЯ — это состояние на конец', () => {
      // Сложи мы остатки (60 + 210 + 200), получили бы 470 — число,
      // которого не существует ни в одном дне и ни в одной выписке.
      const [month] = aggregateForecast(days, 'month', TODAY);

      expect(month.balance).toBe(200);
    });

    it('границы периода — первый и последний день', () => {
      const [month] = aggregateForecast(days, 'month', TODAY);

      expect(month.from).toBe('2026-09-01');
      expect(month.to).toBe('2026-09-03');
    });
  });

  describe('факт и план внутри одного столбца', () => {
    it('прошедшая часть периода — ФАКТ, оставшаяся — план', () => {
      // При масштабе крупнее дня в одном столбце оказывается и то, что уже
      // случилось, и то, что запланировано. Смешав их молча, мы показали бы
      // план как свершившееся.
      const [month] = aggregateForecast(
        [
          day('2026-09-10', 100, 0, 100),
          day('2026-09-25', 300, 0, 400),
        ],
        'month',
        TODAY,
      );

      expect(month.factInflow).toBe(100);
      expect(month.planInflow).toBe(300);
      expect(month.factInflow + month.planInflow).toBe(month.inflow);
    });

    it('сегодняшний день считается фактом', () => {
      // Он наступил: движение либо случилось, либо случится сегодня же.
      const [month] = aggregateForecast(
        [day(TODAY, 50, 0, 50)],
        'month',
        TODAY,
      );

      expect(month.factInflow).toBe(50);
      expect(month.planInflow).toBe(0);
    });
  });

  describe('выходные', () => {
    it('суббота и воскресенье — выходные', () => {
      expect(isWeekend('2026-09-19')).toBe(true);
      expect(isWeekend('2026-09-20')).toBe(true);
      expect(isWeekend('2026-09-21')).toBe(false);
    });

    it('подсветка выходных только при ДНЕВНОМ масштабе', () => {
      // «Выходная неделя» — бессмыслица: в неделе есть и те, и другие дни.
      const [asDay] = aggregateForecast(
        [day('2026-09-19', 0, 0, 0)],
        'day',
        TODAY,
      );
      const [asWeek] = aggregateForecast(
        [day('2026-09-19', 0, 0, 0)],
        'week',
        TODAY,
      );

      expect(asDay.isWeekend).toBe(true);
      expect(asWeek.isWeekend).toBe(false);
    });
  });

  describe('вырожденные случаи', () => {
    it('пустой прогноз не роняет расчёт', () => {
      expect(aggregateForecast([], 'month', TODAY)).toEqual([]);
      expect(aggregateForecast(undefined, 'month', TODAY)).toEqual([]);
    });

    it('дни без даты отбрасываются, а не ломают период', () => {
      const periods = aggregateForecast(
        [{ inflow: 1 } as any, day('2026-09-01', 5, 0, 5)],
        'month',
        TODAY,
      );

      expect(periods).toHaveLength(1);
      expect(periods[0].inflow).toBe(5);
    });

    it('дневной масштаб оставляет дни как есть', () => {
      const days = [day('2026-09-01', 1, 2, 3), day('2026-09-02', 4, 5, 6)];
      const periods = aggregateForecast(days, 'day', TODAY);

      expect(periods).toHaveLength(2);
      expect(periods[1].balance).toBe(6);
    });

    it('квартал собирает три месяца в один столбец', () => {
      const periods = aggregateForecast(
        [
          day('2026-07-01', 10, 0, 10),
          day('2026-08-01', 20, 0, 30),
          day('2026-09-01', 30, 0, 60),
          day('2026-10-01', 40, 0, 100),
        ],
        'quarter',
        TODAY,
      );

      expect(periods).toHaveLength(2);
      expect(periods[0].inflow).toBe(60);
      expect(periods[1].inflow).toBe(40);
    });
  });
});
