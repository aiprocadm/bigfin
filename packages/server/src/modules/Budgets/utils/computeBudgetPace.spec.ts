// © 2026 Bigfin
import { computeBudgetPace } from './computeBudgetPace';

/**
 * Темп исполнения бюджета (FIN-022 ТЗ-2).
 *
 * «Выполнено 56 %» само по себе не значит ничего: в июле это хорошо, в
 * декабре — беда. Дата в проверках ЗАФИКСИРОВАНА: иначе спека меняла бы
 * ответ каждый день и однажды покраснела бы сама по себе.
 */
const TODAY = '2026-09-20';

describe('темп исполнения бюджета', () => {
  describe('прошедшее время', () => {
    it('годовой бюджет на 20 сентября — 263 дня из 365', () => {
      const pace = computeBudgetPace(
        {
          fromDate: '2026-01-01',
          toDate: '2026-12-31',
          planned: 100,
          actual: 0,
        },
        TODAY,
      );

      expect(pace.totalDays).toBe(365);
      expect(pace.elapsedDays).toBe(263);
      expect(Math.round(pace.elapsedRatio * 100)).toBe(72);
    });

    it('у ЗАВЕРШИВШЕГОСЯ бюджета прошло ровно сто процентов', () => {
      // Не больше: время не может пройти на 140 %.
      const pace = computeBudgetPace(
        {
          fromDate: '2025-01-01',
          toDate: '2025-12-31',
          planned: 100,
          actual: 90,
        },
        TODAY,
      );

      expect(pace.elapsedRatio).toBe(1);
      expect(pace.elapsedDays).toBe(pace.totalDays);
    });

    it('у ещё не начавшегося бюджета не прошло ничего', () => {
      const pace = computeBudgetPace(
        {
          fromDate: '2027-01-01',
          toDate: '2027-12-31',
          planned: 100,
          actual: 0,
        },
        TODAY,
      );

      expect(pace.elapsedDays).toBe(0);
      expect(pace.elapsedRatio).toBe(0);
    });

    it('период из одного дня не делится на ноль', () => {
      const pace = computeBudgetPace(
        {
          fromDate: TODAY,
          toDate: TODAY,
          planned: 100,
          actual: 50,
        },
        TODAY,
      );

      expect(pace.totalDays).toBe(1);
      expect(pace.elapsedRatio).toBe(1);
    });
  });

  describe('доля исполнения', () => {
    it('считается от плана', () => {
      const pace = computeBudgetPace(
        {
          fromDate: '2026-01-01',
          toDate: '2026-12-31',
          planned: 1_000_000,
          actual: 770_000,
        },
        TODAY,
      );

      expect(pace.completionRatio).toBe(0.77);
    });

    it('при НУЛЕВОМ плане не определена, а не ноль', () => {
      // Ноль читался бы как «ничего не потрачено», а бесконечность — вообще
      // не число. Витрина печатает такое как «н/о».
      const pace = computeBudgetPace(
        {
          fromDate: '2026-01-01',
          toDate: '2026-12-31',
          planned: 0,
          actual: 5_000,
        },
        TODAY,
      );

      expect(pace.completionRatio).toBeNull();
      expect(pace.verdict).toBeNull();
    });
  });

  describe('вывод словами', () => {
    const yearly = (actual: number, kind: 'income' | 'expense') =>
      computeBudgetPace(
        {
          fromDate: '2026-01-01',
          toDate: '2026-12-31',
          planned: 100,
          actual,
          kind,
        },
        TODAY,
      ).verdict;

    it('расход впереди времени — «быстрее плана»', () => {
      // Прошло 72 % времени, потрачено 90 %.
      expect(yearly(90, 'expense')).toBe('SPENDING_FASTER');
    });

    it('расход позади времени — «медленнее плана»', () => {
      expect(yearly(40, 'expense')).toBe('SPENDING_SLOWER');
    });

    it('у ДОХОДА тот же перекос значит обратное', () => {
      // Потратить больше времени — плохо, заработать больше — хорошо.
      // Назвать это одинаково значило бы сбить человека с толку.
      expect(yearly(90, 'income')).toBe('INCOME_AHEAD');
      expect(yearly(40, 'income')).toBe('INCOME_BEHIND');
    });

    it('в пределах пяти процентов — «идём по плану»', () => {
      // Без допуска вердикт менялся бы каждый день на ровном месте, и его
      // перестали бы читать.
      expect(yearly(72, 'expense')).toBe('ON_TRACK');
      expect(yearly(75, 'expense')).toBe('ON_TRACK');
      expect(yearly(68, 'expense')).toBe('ON_TRACK');
    });

    it('граница допуска проверена явно', () => {
      // Сдвинься она — бюджет, отставший на шесть процентов, выглядел бы
      // идущим по плану.
      expect(yearly(78, 'expense')).toBe('SPENDING_FASTER');
    });
  });
});
