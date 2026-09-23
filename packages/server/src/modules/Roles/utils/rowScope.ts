// © 2026 Bigfin
import { ClsServiceManager } from 'nestjs-cls';
import { ACCOUNT_TYPE } from '@/constants/accounts';

/**
 * Ограничение роли по строкам (FT-080 ТЗ-3): какие статьи, направления, счета
 * и юрлица видит сотрудник.
 *
 * ЗАЧЕМ. Нанятому финансисту направления «Розница» нельзя показать деньги
 * «Опта», а бухгалтеру ИП — счета ООО. Права вида «видит отчёт» здесь не
 * помогают: отчёт один, а строки в нём — разных людей.
 *
 * ПРАВИЛО. Пусто (null) — ограничения нет. Скрытые строки не «обнуляются», а
 * ИСКЛЮЧАЮТСЯ, и итог считается по доступному подмножеству: сотрудник видит
 * честную сумму того, что ему доверено, а не общую сумму с дырами.
 *
 * ГДЕ ПРИМЕНЯЕТСЯ. Одно место на все чтения проводок — построитель запросов
 * модели `AccountTransaction` (см. `rowScopedQueryBuilder`). Отчёты, реестр,
 * главная, расшифровки и выгрузки читают проводки, и новый отчёт не сможет
 * «забыть» про ограничение. Плюс календарь (плановые операции), строки
 * выписки и список счетов.
 */
export interface RowScope {
  /** Управленческие статьи. */
  articleIds: number[] | null;
  /** Направления (проекты). */
  projectIds: number[] | null;
  /** Денежные счета: банк, касса, карта. */
  accountIds: number[] | null;
  /** Юрлица (этап 8 ТЗ-1, колонка роли появилась раньше). */
  legalEntityIds: number[] | null;
}

/** Типы денежных счетов: ограничение «по счетам» говорит о них. */
export const MONEY_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.CREDIT_CARD,
];

const list = (value: unknown): number[] | null => {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const ids = parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return ids.length ? ids : null;
};

/**
 * Ограничение роли. Администратору — никаких: владелец видит свою
 * организацию целиком, даже если кто-то заполнил списки его роли.
 */
export function rowScopeOfRole(role: any): RowScope | null {
  if (!role || role.slug === 'admin') return null;
  const scope: RowScope = {
    articleIds: list(role.allowedArticleIds),
    projectIds: list(role.allowedProjectIds),
    accountIds: list(role.allowedAccountIds),
    legalEntityIds: list(role.allowedLegalEntityIds),
  };
  return isRowRestricted(scope) ? scope : null;
}

export function isRowRestricted(scope: RowScope | null | undefined): scope is RowScope {
  return !!(
    scope &&
    (scope.articleIds || scope.projectIds || scope.accountIds || scope.legalEntityIds)
  );
}

export const ROW_SCOPE_CLS_KEY = 'rowScope';

/**
 * Ограничение текущего запроса. Вне запроса (фоновые задачи, миграции,
 * расчёты по расписанию) — нет: там нет человека, которого ограничивать.
 */
export function currentRowScope(): RowScope | null {
  try {
    const cls = ClsServiceManager.getClsService();
    if (!cls?.isActive()) return null;
    const scope = cls.get(ROW_SCOPE_CLS_KEY);
    return isRowRestricted(scope) ? scope : null;
  } catch {
    return null;
  }
}

/**
 * «Колонка из списка или пустая» — одной строкой, без вложенного условия.
 *
 * Вложенное условие Objection строит ещё одним запросом той же модели, и
 * хук ограничения срабатывает в нём снова — бесконечно. `??` — имя колонки:
 * knex переводит его в заглавные так же, как обычные имена.
 */
function whereInOrNull(builder: any, column: string, ids: number[]): void {
  const marks = ids.map(() => '?').join(', ');
  builder.whereRaw(`(?? in (${marks}) or ?? is null)`, [column, ...ids, column]);
}

/**
 * Отбор проводок (`accounts_transactions`).
 *
 * Проводка — половина операции, и отбирать её одну по себе нельзя: у оплаты
 * аренды одна нога на счёте «Расчётный», другая на счёте статьи «Аренда».
 * Поэтому правило двухступенчатое:
 *
 * 1. ОПЕРАЦИЯ видна, если у неё есть нога на разрешённом денежном счёте и
 *    нога на счёте разрешённой статьи (для тех разрезов, что ограничены).
 * 2. Внутри видимой операции не показываются ноги на ЧУЖИХ счетах: перевод
 *    между разрешённым и чужим счётом виден только своей половиной, а
 *    операция с разбиением по статьям — только разрешёнными статьями.
 *
 * Направление и юрлицо стоят на каждой проводке — отбор по ним построчный.
 * Строки без юрлица остаются (правило `legalEntityScope.ts`), строки без
 * направления при ограничении по направлениям выпадают: «мои направления»
 * не включают «ничьё».
 *
 * @param builder - запрос Objection/knex к проводкам
 * @param knex - knex организации (для подзапросов без хуков модели)
 * @param table - имя или псевдоним таблицы проводок в запросе
 */
export function applyLedgerRowScope(
  builder: any,
  scope: RowScope | null,
  knex: any,
  table = 'accounts_transactions',
): void {
  if (!isRowRestricted(scope)) return;
  const col = (name: string) => `${table}.${name}`;

  if (scope.projectIds) {
    builder.whereIn(col('project_id'), scope.projectIds);
  }
  if (scope.legalEntityIds) {
    whereInOrNull(builder, col('legal_entity_id'), scope.legalEntityIds);
  }
  if (scope.accountIds) {
    const allowed = scope.accountIds;
    builder.whereExists(
      knex
        .select(1)
        .from('accounts_transactions as row_scope_money')
        .whereColumn('row_scope_money.reference_type', col('reference_type'))
        .whereColumn('row_scope_money.reference_id', col('reference_id'))
        .whereIn('row_scope_money.account_id', allowed),
    );
    builder.whereNotIn(
      col('account_id'),
      knex
        .select('id')
        .from('accounts')
        .whereIn('account_type', MONEY_ACCOUNT_TYPES)
        .whereNotIn('id', allowed),
    );
  }
  if (scope.articleIds) {
    const articleAccounts = (ids: number[] | null, negate: boolean) => {
      const q = knex.select('account_id').from('management_article_accounts');
      return negate ? q.whereNotIn('article_id', ids) : q.whereIn('article_id', ids);
    };
    builder.whereExists(
      knex
        .select(1)
        .from('accounts_transactions as row_scope_article')
        .whereColumn('row_scope_article.reference_type', col('reference_type'))
        .whereColumn('row_scope_article.reference_id', col('reference_id'))
        .whereIn('row_scope_article.account_id', articleAccounts(scope.articleIds, false)),
    );
    builder.whereNotIn(col('account_id'), articleAccounts(scope.articleIds, true));
  }
}

/**
 * Отбор таблиц, где статья, направление и счёт — прямые колонки строки
 * (плановые операции, строки выписки).
 *
 * Разрез, которого у таблицы нет, не применяется: у строки выписки ещё нет
 * ни статьи, ни направления — она их только ждёт.
 */
export function applyColumnsRowScope(
  builder: any,
  scope: RowScope | null,
  columns: { article?: string; project?: string; account?: string; legalEntity?: string },
): void {
  if (!isRowRestricted(scope)) return;
  if (scope.articleIds && columns.article) builder.whereIn(columns.article, scope.articleIds);
  if (scope.projectIds && columns.project) builder.whereIn(columns.project, scope.projectIds);
  if (scope.accountIds && columns.account) builder.whereIn(columns.account, scope.accountIds);
  if (scope.legalEntityIds && columns.legalEntity) {
    whereInOrNull(builder, columns.legalEntity, scope.legalEntityIds);
  }
}

/** Ключи запроса, которыми называют статью, направление и денежный счёт. */
const REQUEST_KEYS: Record<'articleIds' | 'projectIds' | 'accountIds' | 'legalEntityIds', string[]> = {
  articleIds: ['articleid', 'articleids', 'articlesids', 'managementarticleid'],
  projectIds: ['projectid', 'projectids', 'projectsids'],
  accountIds: ['accountid', 'cashflowaccountid', 'bankaccountid'],
  legalEntityIds: ['legalentityid', 'legalentityids', 'legalentitiesids'],
};

const normalizeKey = (key: string) => key.replace(/[_\-\[\]]/g, '').toLowerCase();

const idsOf = (value: unknown): number[] =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);

/**
 * Просит ли запрос чужое (FT-080 AC 3): явный номер направления, статьи или
 * счёта вне разрешённых — отказ, а не пустой ответ. Пустой отчёт сказал бы
 * «у направления нет операций», и человек бы поверил.
 *
 * @returns разрез, в котором попросили чужое, или null
 */
export function forbiddenRowScopeRequest(
  params: Record<string, unknown> | null | undefined,
  scope: RowScope | null,
): keyof typeof REQUEST_KEYS | null {
  if (!isRowRestricted(scope) || !params || typeof params !== 'object') return null;
  for (const [rawKey, value] of Object.entries(params)) {
    const key = normalizeKey(rawKey);
    for (const dimension of Object.keys(REQUEST_KEYS) as (keyof typeof REQUEST_KEYS)[]) {
      const allowed = scope[dimension];
      if (!allowed || !REQUEST_KEYS[dimension].includes(key)) continue;
      if (idsOf(value).some((id) => !allowed.includes(id))) return dimension;
    }
  }
  return null;
}

/** Что сказать в плашке «показаны только доступные вам…» (для витрины). */
export function describeRowScope(scope: RowScope | null) {
  return {
    restricted: isRowRestricted(scope),
    articles: scope?.articleIds?.length ?? 0,
    projects: scope?.projectIds?.length ?? 0,
    accounts: scope?.accountIds?.length ?? 0,
    legalEntities: scope?.legalEntityIds?.length ?? 0,
  };
}
