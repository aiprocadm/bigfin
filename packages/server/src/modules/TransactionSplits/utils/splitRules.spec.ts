// © 2026 Bigfin
import { splitByPercentages, validateSplits } from './splitRules';

/**
 * Этап 10 ТЗ. Разделение операции на части.
 *
 * Всё, что тут может сломаться, ломается молча: суммы, которые «почти
 * сходятся», выглядят нормально, а отчёт расходится с банком на копейки —
 * и эти копейки ищут часами.
 */
const line = (amount: number, articleId: number | null = 1) => ({
  amount,
  articleId,
});

describe('validateSplits', () => {
  it('части, сходящиеся с родительской суммой, проходят', () => {
    const result = validateSplits(100_000, [line(70_000), line(30_000)]);

    expect(result.isValid).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.distributed).toBe(100_000);
  });

  it('недораспределённая сумма показывает остаток', () => {
    // Внизу панели: «Осталось распределить: 30 000 ₽».
    const result = validateSplits(100_000, [line(70_000)]);

    expect(result.isValid).toBe(false);
    expect(result.problem).toBe('not_distributed');
    expect(result.remaining).toBe(30_000);
  });

  it('перебор отличается от недобора', () => {
    // «Осталось −5 000» человеку непонятно; интерфейс должен сказать,
    // что он распределил больше, чем было.
    const result = validateSplits(100_000, [line(70_000), line(35_000)]);

    expect(result.problem).toBe('over_distributed');
    expect(result.remaining).toBe(-5_000);
  });

  it('копейки от сложения не мешают сохранить', () => {
    // 0.1 + 0.2 в числах с плавающей точкой даёт 0.30000000000000004.
    // Сравнение «в лоб» не дало бы нажать кнопку никогда.
    const result = validateSplits(0.3, [line(0.1), line(0.2)]);

    expect(result.isValid).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('пустое разбиение — это не разделение', () => {
    expect(validateSplits(100, []).problem).toBe('empty');
  });

  it('нулевая или отрицательная часть отвергается', () => {
    // Отрицательная часть позволила бы «сойтись» любой ерунде.
    expect(validateSplits(100, [line(150), line(-50)]).problem).toBe(
      'non_positive_line',
    );
    expect(validateSplits(100, [line(100), line(0)]).problem).toBe(
      'non_positive_line',
    );
  });

  it('часть без статьи отвергается', () => {
    // Ради статей разделение и затевалось.
    expect(
      validateSplits(100, [line(70), line(30, null)]).problem,
    ).toBe('article_missing');
  });

  it('проверка суммы идёт после проверки самих частей', () => {
    // Иначе человек увидит «осталось распределить 0» и не поймёт,
    // почему кнопка не нажимается.
    const result = validateSplits(100, [line(100), line(0)]);

    expect(result.problem).toBe('non_positive_line');
  });
});

describe('splitByPercentages', () => {
  it('делит сумму по процентам', () => {
    expect(splitByPercentages(100_000, [70, 30])).toEqual([70_000, 30_000]);
  });

  it('остаток от округления отдаётся последней части', () => {
    // Три доли по 33,33% от 100 ₽ дают 99,99 ₽. Без этого правила
    // разбиение никогда не сойдётся, и правило разноски будет молча
    // отказывать.
    const parts = splitByPercentages(100, [33.33, 33.33, 33.34]);

    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(100);
  });

  it('проценты, не дающие сто, отвергаются', () => {
    // Иначе правило разноски разнесёт половину платежа и промолчит.
    expect(splitByPercentages(100, [50, 30])).toEqual([]);
    expect(splitByPercentages(100, [60, 60])).toEqual([]);
  });

  it('пустые проценты дают пустое разбиение', () => {
    expect(splitByPercentages(100, [])).toEqual([]);
    expect(splitByPercentages(100, [0, 0])).toEqual([]);
  });

  it('результат сходится с исходной суммой', () => {
    const parts = splitByPercentages(999.99, [25, 25, 25, 25]);

    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(999.99);
  });
});
