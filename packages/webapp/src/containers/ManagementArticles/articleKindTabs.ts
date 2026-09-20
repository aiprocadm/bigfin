import type { ArticleKind, ManagementArticle } from './schemas';

/**
 * Пять вкладок справочника статей (FIN-001 ТЗ-2).
 *
 * Порядок не алфавитный и не случайный: сначала то, с чем человек работает
 * каждый день (доходы и расходы), потом балансовое — оно нужно реже и
 * появилось позже.
 */
export const ARTICLE_KIND_TABS: ArticleKind[] = [
  'income',
  'expense',
  'asset',
  'liability',
  'equity',
];

/** Вкладка по умолчанию: с неё начинали и до пяти видов. */
export const DEFAULT_ARTICLE_KIND: ArticleKind = 'income';

const isArticleKind = (value: unknown): value is ArticleKind =>
  typeof value === 'string' &&
  (ARTICLE_KIND_TABS as string[]).includes(value);

/**
 * Читает вкладку из адресной строки.
 *
 * ЗАЧЕМ ВКЛАДКА В АДРЕСЕ. Чтобы ссылку можно было переслать: «посмотри наши
 * обязательства» — и человек открыл бы сразу нужную вкладку, а не искал её.
 * То же правило уже действует для отборов списка операций.
 *
 * Мусор в адресе (`?kind=liabilty`) молча приводится к вкладке по умолчанию,
 * а НЕ показывает пустоту: пустая вкладка читается как «статей нет», то есть
 * врёт. Ошибку опечатавшемуся показывать некому — ссылку прислали ему.
 */
export const kindFromSearch = (search: string): ArticleKind => {
  const value = new URLSearchParams(search).get('kind');

  return isArticleKind(value) ? value : DEFAULT_ARTICLE_KIND;
};

/**
 * Адрес с выбранной вкладкой. Остальные параметры сохраняются: их мог
 * поставить кто-то другой, и терять их при щелчке по вкладке нельзя.
 */
export const searchWithKind = (search: string, kind: ArticleKind): string => {
  const params = new URLSearchParams(search);
  params.set('kind', kind);

  return `?${params.toString()}`;
};

/** Все узлы дерева подряд — считать и отбирать удобнее по плоскому списку. */
const flatten = (nodes: ManagementArticle[] = []): ManagementArticle[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);

/**
 * Сколько статей на каждой вкладке.
 *
 * Считаются ВСЕ статьи вида, включая вложенные: человек видит на вкладке
 * дерево целиком, и число должно отвечать на вопрос «сколько тут строк», а
 * не «сколько корней». Вид берётся у каждого узла, а не у корня: смешанных
 * деревьев не бывает по правилу сервера, но считать по корню значило бы
 * поверить правилу вместо того, чтобы посмотреть.
 */
export const countArticlesByKind = (
  roots: ManagementArticle[] = [],
): Record<ArticleKind, number> => {
  const counts = ARTICLE_KIND_TABS.reduce(
    (acc, kind) => ({ ...acc, [kind]: 0 }),
    {} as Record<ArticleKind, number>,
  );

  flatten(roots).forEach((node) => {
    if (isArticleKind(node?.kind)) counts[node.kind] += 1;
  });

  return counts;
};

/** Корни выбранной вкладки — поддеревья приходят вместе с ними. */
export const rootsOfKind = (
  roots: ManagementArticle[] = [],
  kind: ArticleKind,
): ManagementArticle[] => (roots ?? []).filter((root) => root?.kind === kind);

/**
 * Системная ли статья.
 *
 * Определяется по устойчивому ключу с сервера, а НЕ по имени: имя системной
 * статьи разрешено менять, и «Кредиты банка» перестали бы считаться
 * системными ровно в тот момент, когда их переименовали.
 */
export const isSystemArticle = (article: ManagementArticle): boolean =>
  Boolean(article?.seedKey);
