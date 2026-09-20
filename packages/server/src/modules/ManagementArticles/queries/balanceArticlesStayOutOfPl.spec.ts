// © 2026 Bigfin
import { ArticlesPlRollupService } from './ArticlesPlRollup.service';
import { PL_ARTICLE_KINDS, BALANCE_ARTICLE_KINDS } from '../constants';

/**
 * ГЛАВНОЕ ПРАВИЛО ЭТАПА 17: балансовые статьи не входят в отчёт о прибыли
 * НИ ПРИ КАКОМ методе учёта (правило 1 FIN-001 ТЗ-2).
 *
 * ЧЕМ ЭТО ОПАСНО, ЕСЛИ НЕ ПРОВЕРЯТЬ. Свёртку по статьям зовут ПЯТЬ мест:
 * точка безубыточности, рентабельность сделок, распределение накладных,
 * капитализация и ответы ИИ-аналитика. Попади сюда «Получение кредита» —
 * все пять начнут считать тело кредита выручкой. Причём тихо: строка
 * выглядит как обычная статья, отчёт остаётся связным, а прибыль другая.
 *
 * Проверяется не «есть ли фильтр в коде», а ПОВЕДЕНИЕ: подделка модели
 * запоминает, по каким видам её спросили, и отдаёт балансовые статьи в
 * ответ на любой запрос. Если отбор пропадёт, они окажутся в результате.
 */
const balanceArticles = [
  {
    id: 10,
    name: 'Получение кредита',
    kind: 'liability',
    parentId: null,
    sortOrder: 1,
  },
  {
    id: 11,
    name: 'Покупка оборудования',
    kind: 'asset',
    parentId: null,
    sortOrder: 2,
  },
  {
    id: 12,
    name: 'Взнос собственника',
    kind: 'equity',
    parentId: null,
    sortOrder: 3,
  },
];

const plArticles = [
  { id: 1, name: 'Выручка', kind: 'income', parentId: null, sortOrder: 1 },
  { id: 2, name: 'Аренда', kind: 'expense', parentId: null, sortOrder: 2 },
];

/**
 * Подделка справочника статей.
 *
 * `whereIn` ЗАПОМИНАЕТ фильтр, но НЕ применяет его: отдаются все статьи,
 * включая балансовые. Так проверка ловит и пропавший фильтр, и фильтр,
 * который отбирает не по тому полю.
 */
const makeArticleModel = (seen: { kinds: string[][]; called: number }) => () =>
  ({
    query: () => {
      const builder: any = {
        whereIn: (column: string, values: string[]) => {
          seen.called += 1;
          if (column === 'kind') seen.kinds.push(values);
          return builder;
        },
        orderBy: () => Promise.resolve([...plArticles, ...balanceArticles]),
      };
      return builder;
    },
  }) as any;

/** Пустая подделка модели: сам справочник статей проверяется отдельно. */
const emptyModel = () =>
  ({
    query: () => {
      const builder: any = {
        sum: () => builder,
        groupBy: () => builder,
        select: () => builder,
        onBuild: (fn: any) => {
          fn(builder);
          return Promise.resolve([]);
        },
        whereIn: () => Promise.resolve([]),
        modify: () => builder,
        where: () => builder,
        whereNull: () => builder,
        then: (resolve: any) => resolve([]),
      };
      return builder;
    },
  }) as any;

const buildService = (seen: { kinds: string[][]; called: number }) =>
  new ArticlesPlRollupService(
    makeArticleModel(seen),
    emptyModel as any,
    emptyModel as any,
    emptyModel as any,
  );

describe('балансовые статьи не попадают в отчёт о прибыли', () => {
  it('перечисления видов не пересекаются и покрывают все пять', () => {
    // Иначе проверки ниже проверяли бы пустоту.
    expect([...PL_ARTICLE_KINDS, ...BALANCE_ARTICLE_KINDS].sort()).toEqual(
      ['asset', 'equity', 'expense', 'income', 'liability'].sort(),
    );
    expect(
      PL_ARTICLE_KINDS.filter((kind) =>
        (BALANCE_ARTICLE_KINDS as readonly string[]).includes(kind),
      ),
    ).toEqual([]);
  });

  it('свёртка спрашивает у базы ТОЛЬКО доходы и расходы', async () => {
    const seen = { kinds: [] as string[][], called: 0 };
    await buildService(seen).getRollup({} as any);

    expect(seen.kinds).toEqual([['income', 'expense']]);
  });

  it('та же защита у свёртки с пробелом и у собственных сумм', async () => {
    // Три входа в один расчёт. Защита в общей сборке, а не у каждого входа
    // по отдельности: вход, о котором забыли, — это ошибка, ждущая дня.
    const forUnmapped = { kinds: [] as string[][], called: 0 };
    await buildService(forUnmapped).getRollupWithUnmapped({} as any);
    expect(forUnmapped.kinds).toEqual([['income', 'expense']]);

    const forOwn = { kinds: [] as string[][], called: 0 };
    await buildService(forOwn).getOwnAmounts({} as any);
    expect(forOwn.kinds).toEqual([['income', 'expense']]);
  });

  it('метод учёта на отбор видов не влияет', async () => {
    // «Ни при каком методе учёта» — в ТЗ это сказано буквально. Кассовый
    // метод считает по другим проводкам, но набор видов тот же.
    const accrual = { kinds: [] as string[][], called: 0 };
    await buildService(accrual).getRollup({ basis: 'accrual' } as any);

    const cash = { kinds: [] as string[][], called: 0 };
    await buildService(cash).getRollup({ basis: 'cash' } as any);

    expect(accrual.kinds).toEqual(cash.kinds);
    expect(cash.kinds).toEqual([['income', 'expense']]);
  });
});
