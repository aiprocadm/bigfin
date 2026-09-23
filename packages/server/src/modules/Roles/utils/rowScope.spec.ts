// © 2026 Bigfin
import knex from 'knex';
import { knexSnakeCaseMappers } from 'objection';
import { ClsServiceManager } from 'nestjs-cls';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import {
  currentRowScope,
  describeRowScope,
  forbiddenRowScopeRequest,
  ROW_SCOPE_CLS_KEY,
  RowScope,
  rowScopeOfRole,
} from './rowScope';

/**
 * FT-080 ТЗ-3: ограничение роли по статьям, направлениям и счетам.
 *
 * Проверяется САМ запрос, который уйдёт в базу: фильтр обязан встать в модель
 * проводок, а не в отдельный отчёт — иначе новый отчёт его «забудет».
 */
const db = knex({ client: 'mysql2', ...knexSnakeCaseMappers({ upperCase: true }) });

const scope = (patch: Partial<RowScope>): RowScope => ({
  articleIds: null,
  projectIds: null,
  accountIds: null,
  legalEntityIds: null,
  ...patch,
});

function sqlAs(rowScope: RowScope | null, build: () => any): string {
  const cls = ClsServiceManager.getClsService();
  return cls.run(() => {
    cls.set(ROW_SCOPE_CLS_KEY, rowScope);
    return build().toKnexQuery().toString();
  });
}

const ledger = () => AccountTransaction.bindKnex(db).query().where('date', '>=', '2026-01-01');

describe('ограничение роли: из чего оно берётся', () => {
  it('администратору — никаких ограничений, даже если списки заполнены', () => {
    expect(rowScopeOfRole({ slug: 'admin', allowedProjectIds: [1] })).toBeNull();
  });

  it('пустые списки и NULL — «без ограничения»; JSON-строка читается', () => {
    expect(rowScopeOfRole({ slug: 'staff', allowedProjectIds: [] })).toBeNull();
    expect(rowScopeOfRole({ slug: 'staff', allowedProjectIds: '[3,4]' })).toMatchObject({ projectIds: [3, 4] });
    expect(rowScopeOfRole({ slug: 'staff', allowedLegalEntityIds: [2] })).toMatchObject({ legalEntityIds: [2] });
  });

  it('вне запроса (фоновые задачи) ограничения нет', () => {
    expect(currentRowScope()).toBeNull();
  });

  it('плашка знает, что именно сужено', () => {
    expect(describeRowScope(scope({ projectIds: [1, 2] }))).toMatchObject({ restricted: true, projects: 2 });
    expect(describeRowScope(null)).toMatchObject({ restricted: false });
  });
});

describe('проводки: фильтр стоит в самой модели', () => {
  it('без ограничения запрос не меняется', () => {
    expect(sqlAs(null, ledger)).toBe(
      "select `ACCOUNTS_TRANSACTIONS`.* from `ACCOUNTS_TRANSACTIONS` where `DATE` >= '2026-01-01'",
    );
  });

  it('AC 1: одно направление — только его проводки', () => {
    const sql = sqlAs(scope({ projectIds: [5] }), ledger);
    expect(sql).toContain('`ACCOUNTS_TRANSACTIONS`.`PROJECT_ID` in (5)');
  });

  it('счета: операция должна касаться разрешённого счёта, ноги на чужих денежных счетах скрыты', () => {
    const sql = sqlAs(scope({ accountIds: [10] }), ledger);
    expect(sql).toContain(
      'exists (select 1 from `ACCOUNTS_TRANSACTIONS` as `ROW_SCOPE_MONEY` where `ROW_SCOPE_MONEY`.`REFERENCE_TYPE` = `ACCOUNTS_TRANSACTIONS`.`REFERENCE_TYPE` and `ROW_SCOPE_MONEY`.`REFERENCE_ID` = `ACCOUNTS_TRANSACTIONS`.`REFERENCE_ID` and `ROW_SCOPE_MONEY`.`ACCOUNT_ID` in (10))',
    );
    expect(sql).toContain(
      "`ACCOUNTS_TRANSACTIONS`.`ACCOUNT_ID` not in (select `ID` from `ACCOUNTS` where `ACCOUNT_TYPE` in ('bank', 'cash', 'credit-card') and `ID` not in (10))",
    );
  });

  it('статьи: операция со статьёй из разрешённых, ноги на чужих статьях скрыты', () => {
    const sql = sqlAs(scope({ articleIds: [7] }), ledger);
    expect(sql).toContain(
      '`ROW_SCOPE_ARTICLE`.`ACCOUNT_ID` in (select `ACCOUNT_ID` from `MANAGEMENT_ARTICLE_ACCOUNTS` where `ARTICLE_ID` in (7))',
    );
    expect(sql).toContain(
      '`ACCOUNTS_TRANSACTIONS`.`ACCOUNT_ID` not in (select `ACCOUNT_ID` from `MANAGEMENT_ARTICLE_ACCOUNTS` where `ARTICLE_ID` not in (7))',
    );
  });

  it('юрлица: строки без юрлица остаются (правило этапа 8 ТЗ-1)', () => {
    const sql = sqlAs(scope({ legalEntityIds: [2] }), ledger);
    expect(sql).toContain(
      '(`ACCOUNTS_TRANSACTIONS`.`LEGAL_ENTITY_ID` in (2) or `ACCOUNTS_TRANSACTIONS`.`LEGAL_ENTITY_ID` is null)',
    );
  });

  it('псевдоним таблицы учитывается', () => {
    const sql = sqlAs(scope({ projectIds: [5] }), () =>
      AccountTransaction.bindKnex(db).query().alias('t').sum('credit as credit'),
    );
    expect(sql).toContain('`T`.`PROJECT_ID` in (5)');
  });

  it('запись не фильтруется: удаление проводок операции идёт как было', () => {
    const sql = sqlAs(scope({ accountIds: [10] }), () =>
      AccountTransaction.bindKnex(db).query().delete().where('reference_id', 3),
    );
    expect(sql).not.toContain('ROW_SCOPE');
  });

  it('обход для внутренних сверок — явный', () => {
    const sql = sqlAs(scope({ projectIds: [5] }), () =>
      ledger().context({ skipRowScope: true }),
    );
    expect(sql).not.toContain('PROJECT_ID');
  });
});

describe('календарь и строки выписки', () => {
  it('план — по статье, направлению и счёту', () => {
    const sql = sqlAs(scope({ articleIds: [7], accountIds: [10] }), () =>
      PlannedOperation.bindKnex(db).query(),
    );
    expect(sql).toContain('`PLANNED_OPERATIONS`.`ARTICLE_ID` in (7)');
    expect(sql).toContain('`PLANNED_OPERATIONS`.`ACCOUNT_ID` in (10)');
  });

  it('строка выписки — только по счёту: статьи у неё ещё нет', () => {
    const byAccount = sqlAs(scope({ accountIds: [10] }), () =>
      UncategorizedBankTransaction.bindKnex(db).query(),
    );
    expect(byAccount).toContain('`UNCATEGORIZED_CASHFLOW_TRANSACTIONS`.`ACCOUNT_ID` in (10)');
    const byArticle = sqlAs(scope({ articleIds: [7] }), () =>
      UncategorizedBankTransaction.bindKnex(db).query(),
    );
    expect(byArticle).not.toContain('ARTICLE');
  });
});

describe('AC 3: явная просьба чужого — отказ', () => {
  const own = scope({ projectIds: [5], accountIds: [10] });

  it('чужое направление в запросе отчёта — отказ; своё — можно', () => {
    expect(forbiddenRowScopeRequest({ projectsIds: ['5', '6'] }, own)).toBe('projectIds');
    expect(forbiddenRowScopeRequest({ projectsIds: ['5'] }, own)).toBeNull();
    expect(forbiddenRowScopeRequest({ project_id: 6 }, own)).toBe('projectIds');
  });

  it('чужой денежный счёт — отказ; неограниченный разрез не проверяется', () => {
    expect(forbiddenRowScopeRequest({ accountId: '11' }, own)).toBe('accountIds');
    expect(forbiddenRowScopeRequest({ articleId: 99 }, own)).toBeNull();
  });

  it('без ограничения — ничего не проверяется', () => {
    expect(forbiddenRowScopeRequest({ projectsIds: [6] }, null)).toBeNull();
  });
});
