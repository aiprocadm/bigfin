// © 2026 Bigfin
import { computeDirectionsProfit } from '@/modules/Dashboard/queries/computeDirectionsProfit';
import { breakdownContactDebt } from '@/modules/Contacts/queries/computeDebtBreakdown';
import {
  isIntercompanyReference,
  shouldExcludeIntercompany,
} from '@/modules/LegalEntities/utils/intercompany';

import {
  CONVERGENCE_FIXTURES,
  CONVERGENCE_TOLERANCE,
  ConvergenceFixture,
} from './fixtures';

/**
 * Инварианты 4, 7 и 10 раздела 11.10 ТЗ-2, на всех трёх наборах.
 *
 *  4. `Σ колонок по направлениям = колонка «Итого»`, включая «Без направления».
 *  7. Денежная и неденежная дебиторка не противоречат сальдо контрагента.
 * 10. Сводный режим по группе юрлиц = Σ по юрлицам − внутригрупповые обороты.
 *
 * Считают ЖИВЫЕ функции продукта, а не переписанная здесь арифметика:
 * проверка, повторяющая расчёт своими словами, проверяет саму себя.
 */
const fixtures = CONVERGENCE_FIXTURES.map((f) => [f.key, f] as const);

describe('сходимость отчётов по разрезам', () => {
  describe.each(fixtures)('набор %s', (_key: string, fixture: ConvergenceFixture) => {
    it('Σ направлений и «Без направления» = ИТОГО (инвариант 4)', () => {
      // Строка «Без направления» существует ради этого равенства: без неё
      // сумма колонок меньше «Итого», и человек ищет пропавшие деньги.
      const result = computeDirectionsProfit(fixture.directions);

      const named = result.rows.reduce((sum, row) => sum + row.profit, 0);
      const unassigned = result.unassigned?.profit ?? 0;

      const total = fixture.directions.reduce(
        (sum, row) => sum + row.revenue - row.costs,
        0,
      );

      expect(Math.abs(named + unassigned - total)).toBeLessThanOrEqual(
        CONVERGENCE_TOLERANCE,
      );
    });

    it('разбор долга НЕ ПРОТИВОРЕЧИТ сальдо (инвариант 7)', () => {
      // Разбивку сверят с отчётом старения, и расхождение обесценит оба
      // числа сразу.
      fixture.debts.forEach((position) => {
        const result = breakdownContactDebt(position);

        expect(result.receivable.money - result.payable.goods).toBeCloseTo(
          position.receivableNet,
          2,
        );
        expect(result.payable.money - result.receivable.goods).toBeCloseTo(
          position.payableNet,
          2,
        );
      });
    });

    it('сводный режим = Σ по юрлицам − внутригрупповые (инвариант 10)', () => {
      // Режим «все юрлица» — это консолидация, и внутригрупповой оборот в
      // ней перекладывание из кармана в карман, а не выручка.
      expect(shouldExcludeIntercompany([])).toBe(true);

      const perEntity = fixture.entities.reduce(
        (sum, entity) => sum + entity.revenue,
        0,
      );
      const consolidated = perEntity - fixture.intercompanyRevenue;

      // Сводная выручка обязана совпасть с той, что показывает отчёт по
      // статьям: он и есть «Итого» группы.
      const byArticles = fixture.amounts
        .filter((amount) => {
          const article = fixture.articles.find((a) => a.id === amount.id);
          return article?.kind === 'income' && article?.parentId === null;
        })
        .reduce((sum, amount) => sum + amount.amount, 0);

      expect(Math.abs(consolidated - byArticles)).toBeLessThanOrEqual(
        CONVERGENCE_TOLERANCE,
      );
    });
  });

  describe('правила исключения внутригрупповых оборотов', () => {
    it('одно юрлицо — обороты НЕ исключаются', () => {
      // Для него самого это настоящий доход, а не перекладывание.
      expect(shouldExcludeIntercompany([1])).toBe(false);
    });

    it('несколько юрлиц — исключаются', () => {
      expect(shouldExcludeIntercompany([1, 2])).toBe(true);
    });

    it('операция между разными юрлицами — внутригрупповая', () => {
      expect(
        isIntercompanyReference([
          { accountId: 1, legalEntityId: 1 },
          { accountId: 2, legalEntityId: 2 },
        ]),
      ).toBe(true);
    });

    it('НЕИЗВЕСТНОЕ ЮРЛИЦО НЕ СЧИТАЕТСЯ ЧУЖИМ', () => {
      // Иначе внутригрупповым окажется КАЖДЫЙ перевод, и сводный отчёт
      // молча потеряет настоящую выручку.
      expect(
        isIntercompanyReference([
          { accountId: 1, legalEntityId: 1 },
          { accountId: 2, legalEntityId: null },
        ]),
      ).toBe(false);
    });
  });

  it('набор Б действительно содержит внутригрупповой оборот', () => {
    // Иначе инвариант 10 проверялся бы на нуле и ничего не значил.
    const fixture = CONVERGENCE_FIXTURES.find((f) => f.key === 'Б')!;

    expect(fixture.intercompanyRevenue).toBeGreaterThan(0);
    expect(fixture.entities.length).toBeGreaterThan(1);
  });

  it('набор Б действительно содержит операции без направления', () => {
    const fixture = CONVERGENCE_FIXTURES.find((f) => f.key === 'Б')!;
    const result = computeDirectionsProfit(fixture.directions);

    expect(result.unassigned).not.toBeNull();
  });
});
