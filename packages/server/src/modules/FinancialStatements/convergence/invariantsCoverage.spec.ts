// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Все десять инвариантов раздела 11.10 ТЗ-2 имеют СВОЮ проверку.
 *
 * ЗАЧЕМ ЭТОТ РЕЕСТР. «Инварианты покрыты» — утверждение, которое легко
 * сделать и невозможно проверить глазами: спеки лежат в разных модулях, и
 * удалить одну из них можно, ничего не заметив. Здесь список инвариантов
 * записан в код, и рядом с каждым — файл, который его держит. Файл исчез —
 * прогон краснеет, и молчаливая потеря страховки становится видимой.
 *
 * Это НЕ замена самим проверкам: реестр следит за их наличием, а считают
 * они. Поэтому каждая запись требует ещё и слова из текста инварианта —
 * файл, в котором о нём не говорится, зачтён не будет.
 */
const SERVER_SRC = path.resolve(__dirname, '..', '..', '..');

interface InvariantCoverage {
  /** Номер из раздела 11.10 ТЗ-2. */
  number: number;
  invariant: string;
  /** Файл проверки относительно `src/`. */
  spec: string;
  /** Слово, которое обязано встретиться в файле проверки. */
  marker: string;
}

const COVERAGE: InvariantCoverage[] = [
  {
    number: 1,
    invariant: 'Остаток на начало + чистый поток = остаток на конец',
    spec: 'modules/FinancialStatements/convergence/cashFlowConvergence.spec.ts',
    marker: 'начало + поток = конец',
  },
  {
    number: 2,
    invariant: 'Активы = Обязательства + Капитал',
    spec: 'modules/FinancialStatements/convergence/balanceConvergence.spec.ts',
    marker: 'АКТИВЫ = ОБЯЗАТЕЛЬСТВА + КАПИТАЛ',
  },
  {
    number: 3,
    invariant: 'Итог раскрытия = сумма в отчёте',
    spec: 'modules/FinancialStatements/queries/drillDownByArticle.spec.ts',
    marker: 'статьи',
  },
  {
    number: 4,
    invariant: 'Σ колонок по направлениям = «Итого», включая «Без направления»',
    spec: 'modules/FinancialStatements/convergence/reportsConvergence.spec.ts',
    marker: 'инвариант 4',
  },
  {
    number: 5,
    invariant: 'Σ поступлений − Σ выплат = итог сводной строки реестра',
    spec: 'modules/FinancialStatements/convergence/registryAndWidgetConvergence.spec.ts',
    marker: 'инвариант 5',
  },
  {
    number: 6,
    invariant: 'Σ остатков по группам счетов = общий остаток',
    spec: 'modules/FinancialStatements/convergence/registryAndWidgetConvergence.spec.ts',
    marker: 'инвариант 6',
  },
  {
    number: 7,
    invariant: 'Денежная и неденежная дебиторка не противоречат сальдо',
    spec: 'modules/FinancialStatements/convergence/reportsConvergence.spec.ts',
    marker: 'инвариант 7',
  },
  {
    number: 8,
    invariant: 'Сумма статьи в отчёте = сумме той же статьи в схеме',
    spec: 'modules/ManagementArticles/queries/buildArticleReportMap.spec.ts',
    marker: 'статья',
  },
  {
    number: 9,
    invariant: 'Итог блока «Переводы между своими счетами» = 0',
    spec: 'modules/FinancialStatements/convergence/cashFlowConvergence.spec.ts',
    marker: 'РОВНО НОЛЬ',
  },
  {
    number: 10,
    invariant: 'Сводный режим = Σ по юрлицам − внутригрупповые обороты',
    spec: 'modules/FinancialStatements/convergence/reportsConvergence.spec.ts',
    marker: 'инвариант 10',
  },
];

const read = (relative: string): string =>
  fs.readFileSync(path.join(SERVER_SRC, relative), 'utf8');

describe('инварианты раздела 11.10: у каждого есть своя проверка', () => {
  it('в реестре ровно десять инвариантов, и номера не повторяются', () => {
    expect(COVERAGE).toHaveLength(10);
    expect(new Set(COVERAGE.map((row) => row.number)).size).toBe(10);
  });

  describe.each(COVERAGE.map((row) => [row.number, row] as const))(
    'инвариант %s',
    (_number: number, coverage: InvariantCoverage) => {
      it(`(${coverage.invariant}) — файл проверки существует`, () => {
        expect(fs.existsSync(path.join(SERVER_SRC, coverage.spec))).toBe(true);
      });

      it('файл проверки действительно про этот инвариант', () => {
        // Иначе реестр зачтёт любой существующий файл, и страховка станет
        // формальной.
        expect(read(coverage.spec)).toContain(coverage.marker);
      });
    },
  );

  it('проверки сходимости гоняются на ТРЁХ наборах данных', () => {
    // Требование раздела 14.2 ТЗ. Один удобный пример проверяет инвариант
    // наполовину: расхождения живут там, где данные неудобные.
    const fixtures = read(
      'modules/FinancialStatements/convergence/fixtures.ts',
    );

    expect(fixtures).toContain("key: 'А'");
    expect(fixtures).toContain("key: 'Б'");
    expect(fixtures).toContain("key: 'В'");
  });

  it('«сегодня» в наборах ЗАФИКСИРОВАНО', () => {
    // Иначе спеки про разрывы и прошедшее время однажды покраснеют сами,
    // без единой правки кода.
    const fixtures = read(
      'modules/FinancialStatements/convergence/fixtures.ts',
    );

    expect(fixtures).toMatch(/FIXED_TODAY = '\d{4}-\d{2}-\d{2}'/);
  });

  it('допуск сходимости — половина копейки, как требует ТЗ', () => {
    const fixtures = read(
      'modules/FinancialStatements/convergence/fixtures.ts',
    );

    expect(fixtures).toContain('CONVERGENCE_TOLERANCE = 0.005');
  });
});
