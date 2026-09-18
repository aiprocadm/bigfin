// © 2026 Bigfin
import {
  SHARP_GROWTH_THRESHOLD,
  buildTopExpenseArticles,
  computeExpenseShare,
  computeSafetyMargin,
  splitExpensesByBehavior,
} from './expensesAnalysisMath';

const article = (over: Partial<any> = {}) => ({
  id: 1,
  name: 'Аренда',
  kind: 'expense',
  costBehavior: 'fixed',
  amount: 100,
  ...over,
});

describe('splitExpensesByBehavior — три корзины, а не две', () => {
  it('неразмеченные статьи НЕ считаются переменными', () => {
    // Главная ловушка этапа: поле в базе допускает пустоту. Молча отнести
    // пустые к переменным — значит занизить постоянные затраты и показать
    // точку безубыточности ближе, чем она есть.
    const split = splitExpensesByBehavior([
      article({ id: 1, costBehavior: 'fixed', amount: 200 }),
      article({ id: 2, costBehavior: 'variable', amount: 300 }),
      article({ id: 3, costBehavior: null, amount: 500 }),
    ]);

    expect(split.fixed).toBe(200);
    expect(split.variable).toBe(300);
    expect(split.unset).toBe(500);
    expect(split.total).toBe(1000);
  });

  it('мусор в поле тоже считается неразмеченным', () => {
    // Справочник правят руками и через импорт; «постоянные» строкой
    // по-русски не должны тихо попасть в постоянные.
    const split = splitExpensesByBehavior([
      article({ id: 1, costBehavior: 'постоянный', amount: 100 }),
    ]);

    expect(split.fixed).toBe(0);
    expect(split.unset).toBe(100);
  });

  it('доходные статьи в расходы не попадают', () => {
    const split = splitExpensesByBehavior([
      article({ id: 1, kind: 'income', costBehavior: 'fixed', amount: 900 }),
      article({ id: 2, kind: 'expense', costBehavior: 'fixed', amount: 100 }),
    ]);

    expect(split.total).toBe(100);
  });

  it('доли считаются от суммы расходов и сходятся в единицу', () => {
    const split = splitExpensesByBehavior([
      article({ id: 1, costBehavior: 'fixed', amount: 250 }),
      article({ id: 2, costBehavior: 'variable', amount: 750 }),
    ]);

    expect(split.fixedShare).toBe(0.25);
    expect(split.variableShare).toBe(0.75);
    expect(split.fixedShare + split.variableShare).toBe(1);
  });

  it('без расходов доли нулевые, а не деление на ноль', () => {
    const split = splitExpensesByBehavior([]);

    expect(split.total).toBe(0);
    expect(split.fixedShare).toBe(0);
    expect(Number.isFinite(split.variableShare)).toBe(true);
  });

  it('считает, сколько статей ждут разметки', () => {
    // Нулевая статья без пометки человека не беспокоит — беспокоят те,
    // по которым деньги ходили.
    const split = splitExpensesByBehavior([
      article({ id: 1, costBehavior: null, amount: 500 }),
      article({ id: 2, costBehavior: null, amount: 0 }),
      article({ id: 3, costBehavior: 'fixed', amount: 100 }),
    ]);

    expect(split.unsetArticles).toBe(1);
  });
});

describe('computeSafetyMargin — запас прочности', () => {
  it('считает, на сколько может упасть выручка до убытка', () => {
    const margin = computeSafetyMargin(1_000_000, {
      value: 800_000,
      applicable: true,
    });

    expect(margin).toEqual({ value: 0.2, applicable: true });
  });

  it('убыточный бизнес получает отрицательный запас, а не ноль', () => {
    // Ноль читался бы как «ровно на грани». Минус — «уже за гранью».
    const margin = computeSafetyMargin(800_000, {
      value: 1_000_000,
      applicable: true,
    });

    expect(margin.applicable).toBe(true);
    expect(margin.value).toBeLessThan(0);
  });

  it('без выручки запас не считается', () => {
    expect(
      computeSafetyMargin(0, { value: 100, applicable: true }).applicable,
    ).toBe(false);
  });

  it('недостижимая безубыточность — запаса нет вовсе', () => {
    // При неположительной марже постоянные затраты не покрыть ни при какой
    // выручке. «0%» тут соврал бы, что бизнес на грани.
    expect(
      computeSafetyMargin(1_000_000, { value: 0, applicable: false }),
    ).toEqual({ value: 0, applicable: false });
  });
});

describe('computeExpenseShare — доля расходов в выручке', () => {
  it('считает долю', () => {
    expect(computeExpenseShare(1_000_000, 700_000)).toBe(0.7);
  });

  it('без выручки доля пустая, а не ноль', () => {
    // Нарисованный ноль читался бы как «расходов не было».
    expect(computeExpenseShare(0, 700_000)).toBeNull();
  });
});

describe('buildTopExpenseArticles — структура расходов с динамикой', () => {
  it('сортирует по сумме и режет по лимиту', () => {
    const rows = buildTopExpenseArticles(
      [
        article({ id: 1, name: 'Мелочь', amount: 10 }),
        article({ id: 2, name: 'Аренда', amount: 500 }),
        article({ id: 3, name: 'Зарплата', amount: 900 }),
      ],
      [],
      2,
    );

    expect(rows.map((row) => row.name)).toEqual(['Зарплата', 'Аренда']);
  });

  it('подсвечивает рост больше 20%', () => {
    const rows = buildTopExpenseArticles(
      [article({ id: 1, amount: 130 })],
      [article({ id: 1, amount: 100 })],
    );

    expect(rows[0].growthPct).toBe(0.3);
    expect(rows[0].isSharpGrowth).toBe(true);
  });

  it('ровно 20% — это ещё не резкий рост', () => {
    // Порог из ТЗ — «более чем на 20%», а не «от 20%».
    const rows = buildTopExpenseArticles(
      [article({ id: 1, amount: 120 })],
      [article({ id: 1, amount: 100 })],
    );

    expect(rows[0].growthPct).toBe(SHARP_GROWTH_THRESHOLD);
    expect(rows[0].isSharpGrowth).toBe(false);
  });

  it('новая статья расходов подсвечивается, хотя доли роста нет', () => {
    // Делить на ноль нечем, но новая статья — ровно то, что человек должен
    // заметить. Приравнять её к «росту на 0%» значило бы спрятать её.
    const rows = buildTopExpenseArticles(
      [article({ id: 9, name: 'Юристы', amount: 300 })],
      [],
    );

    expect(rows[0].growthPct).toBeNull();
    expect(rows[0].isNew).toBe(true);
    expect(rows[0].isSharpGrowth).toBe(true);
  });

  it('упавшая статья не подсвечивается', () => {
    const rows = buildTopExpenseArticles(
      [article({ id: 1, amount: 50 })],
      [article({ id: 1, amount: 100 })],
    );

    expect(rows[0].growthAbs).toBe(-50);
    expect(rows[0].isSharpGrowth).toBe(false);
  });

  it('статьи без движения в список не идут', () => {
    const rows = buildTopExpenseArticles(
      [article({ id: 1, amount: 0 }), article({ id: 2, amount: 100 })],
      [],
    );

    expect(rows.map((row) => row.articleId)).toEqual([2]);
  });

  it('доходные статьи в расходы не попадают', () => {
    const rows = buildTopExpenseArticles(
      [article({ id: 1, kind: 'income', amount: 900 })],
      [],
    );

    expect(rows).toEqual([]);
  });
});
