# Управленческий каркас — Этап 0 «Статьи учёта» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить управленческий слой «статьи учёта» (дерево управленческих категорий поверх плана счетов) с CRUD, сидом дефолтного RU-дерева и свёрткой «счёт→статья» для отчёта, всё за feature-флагом `mgmt_articles` (по умолчанию выключен).

**Architecture (вариант C из спеки):** `management_articles` — самостоятельное дерево (RU-названия, любая вложенность) с `kind` (income/expense) и `cashflow_section`. `management_article_accounts` связывает счета со статьёй (UNIQUE по `account_id` — один счёт входит ровно в одну статью). Факт по-прежнему считается по счетам; новый сервис-свёртка берёт суммы по счетам и складывает их в статьи по карте. Направление = существующий `branch_id` (новых таблиц не создаём). Всё additive, tenant-схема, под флагом `Features.MGMT_ARTICLES`.

**Tech Stack:** NestJS 10 + Objection/Knex (tenant-миграции), Jest (unit). Frontend — новый стек: React 18, shadcn `components/ui`, React Hook Form + Zod, React Query v3. i18n: `react-intl-universal` (web) + `nestjs-i18n` (server).

---

## Pre-flight (читать до старта)

**Гейтинг.** Реализация этого этапа начинается **после Ф1 роадмапа** (① русификация, ③ режим «Бизнес/Бухгалтер»). План написан заранее; код пишем, когда Ф1 стабилизирован. Флаг `mgmt_articles` по умолчанию `false` — даже смерженный код невидим, пока флаг не включён для организации.

**Окружение.** Node 18.16.1 (`fnm use 18.16.1` / `nvm use 18.16.1`), только `pnpm`. Локальный backend не поднят — серверную логику проверяем через `pnpm --filter @bigfin/server test` и `pnpm typecheck`, фронт — через `pnpm typecheck` + `pnpm dev:webapp`. SDK-типы регенерируются **в CI** (локально заблокировано), руками `shared/sdk-ts` не трогаем.

**Правила основателя (соблюдать на каждом шаге).**
1. Перед правкой существующего файла — показать релевантный фрагмент.
2. Маленькие шаги: один таск = одно логическое изменение, пауза после каждого.
3. После каждого таска — команда проверки + способ отката (указаны в шаге Commit).
4. Ничего не удаляем без явного подтверждения (в этом плане удалений нет — всё additive).

**Миграции.** Только additive. Обязательный рабочий `down()`. Каждую новую таблицу прогнать `latest → rollback → latest` локально. Создавать через скилл `make-migration` (он сам ставит корректный timestamp). Имена файлов ниже даны с timestamp-префиксом-образцом `20260529…` — при создании используйте фактический timestamp от скилла, сохранив описательный суффикс.

**i18n.** Любая строка экрана — через `intl.get('...')` / `<T id="..." />`. Сообщения Zod — тоже через `intl.get`, не хардкодить RU в схемах. После правок lang-файлов — `node packages/webapp/scripts/lang-check.js` (парность EN↔RU строго). Скилл `i18n-add-string`.

**Бренд.** Везде только `Bigfin`. Никаких исторических вариантов названия.

---

## File Structure

**Backend — новый модуль `packages/server/src/modules/ManagementArticles/`:**

| Файл | Ответственность |
|---|---|
| `models/ManagementArticle.model.ts` | Objection-модель статьи (дерево + связь со счетами) |
| `models/ManagementArticleAccount.model.ts` | Модель строки карты «статья↔счёт» |
| `dtos/ManagementArticle.dto.ts` | Command/Create/Edit DTO (class-validator + `@ApiProperty`) |
| `dtos/GetManagementArticlesQuery.dto.ts` | DTO фильтра списка |
| `dtos/ManagementArticleResponse.dto.ts` | DTO ответа (Swagger) |
| `dtos/ArticlesRollupQuery.dto.ts` | DTO фильтра свёртки (extends `FinancialSheetBranchesQueryDto`) |
| `ManagementArticle.interfaces.ts` | Интерфейсы payload/response |
| `constants.ts` | Коды ошибок `ERRORS` |
| `commands/CommandManagementArticleValidator.service.ts` | Валидация имени/родителя/счетов |
| `commands/CreateManagementArticle.service.ts` | Создание статьи + синк карты счетов |
| `commands/EditManagementArticle.service.ts` | Правка статьи + ресинк карты |
| `commands/DeleteManagementArticle.service.ts` | Удаление статьи |
| `queries/GetManagementArticle.service.ts` | Получить одну статью |
| `queries/GetManagementArticles.service.ts` | Список + дерево |
| `queries/ArticlesPlRollup.service.ts` | Свёртка «счёт→статья» (факт по статьям) |
| `utils/buildArticleTree.ts` | Чистая функция «плоский список → дерево» |
| `ManagementArticles.application.ts` | Оркестратор (фасад над командами/запросами) |
| `ManagementArticles.controller.ts` | REST `@Controller('management-articles')` |
| `ManagementArticles.module.ts` | NestJS-модуль |

**Backend — точечные правки существующих файлов:**

| Файл | Правка |
|---|---|
| `packages/server/src/common/types/Features.ts` | + `MGMT_ARTICLES = 'mgmt_articles'` в enum |
| `packages/server/src/modules/Features/FeaturesConfigure.ts` | + запись `{ name: Features.MGMT_ARTICLES, defaultValue: false }` |
| `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` | + регистрация двух новых моделей |
| `packages/server/src/modules/App/App.module.ts` | + импорт `ManagementArticlesModule` |

**Backend — миграции и сид:**

| Файл | Ответственность |
|---|---|
| `packages/server/src/database/tenant/migrations/20260529120000_create_management_articles_table.ts` | Таблица статей |
| `packages/server/src/database/tenant/migrations/20260529120100_create_management_article_accounts_table.ts` | Таблица карты |
| `packages/server/src/database/tenant/seeds/core/20260529120200_seed_management_articles.ts` | Дефолтное RU-дерево + базовая карта |
| `packages/server/src/database/tenant/seeds/data/managementArticles.ts` | Данные дерева |

**Frontend — `packages/webapp/src/`:**

| Файл | Ответственность |
|---|---|
| `hooks/query/managementArticles.tsx` | React Query хуки (list/tree/create/edit/delete/rollup) |
| `hooks/query/types.tsx` | + ключи `MANAGEMENT_ARTICLES…` (правка) |
| `containers/ManagementArticles/ManagementArticlesPage.tsx` | Страница-дерево статей |
| `containers/ManagementArticles/ArticleFormDialog.tsx` | Модалка создания/правки (RHF + Zod) |
| `containers/ManagementArticles/schemas.ts` | Zod-схема формы |
| `containers/ManagementArticles/ArticleTree.tsx` | Рекурсивный рендер дерева |
| `routes/dashboard.tsx` | + маршрут (правка) |
| `lang/en/index.json`, `lang/ru/index.json` | + ключи i18n (правка) |

---

# Part A — Backend: каркас и CRUD

## Task A1: Feature-флаг `mgmt_articles`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.spec.ts` (create)

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/Features/FeaturesConfigure.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('registers the management articles feature, default off', () => {
    const configure = build().getConfigure();
    const mgmt = configure.find((f) => f.name === Features.MGMT_ARTICLES);

    expect(mgmt).toBeDefined();
    expect(mgmt?.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.spec.ts`
Expected: FAIL — `Features.MGMT_ARTICLES` не существует (ошибка типов / `undefined`).

- [ ] **Step 3: Добавить значение enum**

In `packages/server/src/common/types/Features.ts`, расширить enum:

```ts
export enum Features {
  WAREHOUSES = 'warehouses',
  BRANCHES = 'branches',
  BankSyncing = 'BankSyncing',
  MGMT_ARTICLES = 'mgmt_articles',
}
```

- [ ] **Step 4: Зарегистрировать флаг в конфигуре**

In `packages/server/src/modules/Features/FeaturesConfigure.ts`, добавить запись в массив `getConfigure()` (после `BankSyncing`):

```ts
      {
        name: Features.BankSyncing,
        defaultValue: this.configService.get('bankfeed.enabled') ?? false,
      },
      {
        name: Features.MGMT_ARTICLES,
        defaultValue: false,
      },
    ];
  }
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.spec.ts
git commit -m "feat(server): add mgmt_articles feature flag (default off)"
```
Откат: `git revert <hash>` или `git checkout -- <files>` до коммита.

---

## Task A2: Миграция таблицы `management_articles`

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260529120000_create_management_articles_table.ts`

- [ ] **Step 1: Создать миграцию через скилл**

Используйте скилл `make-migration` (схема: **tenant**), имя `create_management_articles_table`. Скилл создаст файл с актуальным timestamp в `packages/server/src/database/tenant/migrations/`.

- [ ] **Step 2: Заполнить миграцию**

Содержимое файла (шаблон — чистый PostgreSQL/Knex, по образцу `…_create_branches_table.ts`; **не** копировать MySQL `AUTO_INCREMENT` из старой `accounts`-миграции):

```ts
exports.up = (knex) => {
  return knex.schema.createTable('management_articles', (table) => {
    table.increments('id');

    table.string('name').notNullable().index();
    table
      .integer('parent_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('management_articles');
    table.string('kind').notNullable().index(); // 'income' | 'expense'
    table.string('cashflow_section').nullable(); // 'operating' | 'investing' | 'financing' | null
    table.integer('sort_order').unsigned().defaultTo(0);
    table.boolean('active').defaultTo(true).index();

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('management_articles');
```

- [ ] **Step 3: Прогнать миграцию в обе стороны**

Run:
```bash
pnpm tenants:migrate:latest
pnpm tenants:migrate:rollback
pnpm tenants:migrate:latest
```
Expected: все три команды завершаются без ошибок; после первого `latest` таблица `management_articles` создаётся, после `rollback` — удаляется, после второго `latest` — снова создаётся.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/database/tenant/migrations/*_create_management_articles_table.ts
git commit -m "feat(server): add management_articles tenant migration"
```
Откат: `pnpm tenants:migrate:rollback`, затем `git checkout -- <file>`.

---

## Task A3: Миграция таблицы `management_article_accounts`

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260529120100_create_management_article_accounts_table.ts`

- [ ] **Step 1: Создать миграцию через скилл**

Скилл `make-migration` (схема: **tenant**), имя `create_management_article_accounts_table`.

- [ ] **Step 2: Заполнить миграцию**

```ts
exports.up = (knex) => {
  return knex.schema.createTable('management_article_accounts', (table) => {
    table.increments('id');

    table
      .integer('article_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('management_articles')
      .onDelete('CASCADE');
    table
      .integer('account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .onDelete('CASCADE');

    table.timestamps();

    // v1: один счёт входит ровно в одну статью — исключает двойной счёт в свёртке.
    table.unique(['account_id']);
  });
};

exports.down = (knex) =>
  knex.schema.dropTableIfExists('management_article_accounts');
```

- [ ] **Step 3: Прогнать миграцию в обе стороны**

Run:
```bash
pnpm tenants:migrate:latest
pnpm tenants:migrate:rollback
pnpm tenants:migrate:latest
```
Expected: без ошибок в обе стороны.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/database/tenant/migrations/*_create_management_article_accounts_table.ts
git commit -m "feat(server): add management_article_accounts tenant migration"
```
Откат: `pnpm tenants:migrate:rollback`, затем `git checkout -- <file>`.

---

## Task A4: Чистая функция дерева `buildArticleTree`

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/utils/buildArticleTree.ts`
- Test: `packages/server/src/modules/ManagementArticles/utils/buildArticleTree.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/ManagementArticles/utils/buildArticleTree.spec.ts`:

```ts
import { buildArticleTree } from './buildArticleTree';

describe('buildArticleTree', () => {
  it('nests children under their parent by parentId', () => {
    const flat = [
      { id: 1, name: 'Доходы', parentId: null },
      { id: 2, name: 'Выручка', parentId: 1 },
      { id: 3, name: 'Расходы', parentId: null },
    ];

    const tree = buildArticleTree(flat);

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe(2);
    expect(tree[1].id).toBe(3);
    expect(tree[1].children).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(buildArticleTree([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/utils/buildArticleTree.spec.ts`
Expected: FAIL — модуль `buildArticleTree` не найден.

- [ ] **Step 3: Реализовать функцию**

Create `packages/server/src/modules/ManagementArticles/utils/buildArticleTree.ts`:

```ts
export interface ArticleNode {
  id: number;
  name: string;
  parentId: number | null;
  children: ArticleNode[];
  [key: string]: any;
}

/**
 * Converts a flat list of articles into a nested tree by `parentId`.
 * @param {Array<{ id: number; parentId: number | null }>} articles
 * @returns {ArticleNode[]} root nodes
 */
export function buildArticleTree(articles: any[]): ArticleNode[] {
  const byId = new Map<number, ArticleNode>();
  const roots: ArticleNode[] = [];

  articles.forEach((article) => {
    byId.set(article.id, { ...article, children: [] });
  });

  byId.forEach((node) => {
    if (node.parentId != null && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/utils/buildArticleTree.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/utils/buildArticleTree.ts packages/server/src/modules/ManagementArticles/utils/buildArticleTree.spec.ts
git commit -m "feat(server): add buildArticleTree tree builder util"
```
Откат: `git checkout -- packages/server/src/modules/ManagementArticles/utils/`.

---

## Task A5: Модели Objection

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/models/ManagementArticle.model.ts`
- Create: `packages/server/src/modules/ManagementArticles/models/ManagementArticleAccount.model.ts`

> Эти модели не имеют отдельного unit-теста (классы-обёртки Objection). Проверка — через `pnpm typecheck` и тесты команд/запросов в следующих тасках.

- [ ] **Step 1: Создать модель статьи**

Create `packages/server/src/modules/ManagementArticles/models/ManagementArticle.model.ts`:

```ts
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class ManagementArticle extends TenantBaseModel {
  name!: string;
  parentId!: number | null;
  kind!: string;
  cashflowSection!: string | null;
  sortOrder!: number;
  active!: boolean;

  /**
   * Table name.
   */
  static get tableName() {
    return 'management_articles';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const {
      Account,
    } = require('@/modules/Accounts/models/Account.model');

    return {
      /**
       * Article belongs to a parent article.
       */
      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: ManagementArticle,
        join: {
          from: 'management_articles.parentId',
          to: 'management_articles.id',
        },
      },

      /**
       * Article may have many child articles.
       */
      children: {
        relation: Model.HasManyRelation,
        modelClass: ManagementArticle,
        join: {
          from: 'management_articles.id',
          to: 'management_articles.parentId',
        },
      },

      /**
       * Article rolls up many accounts (through the mapping table).
       */
      accounts: {
        relation: Model.ManyToManyRelation,
        modelClass: Account,
        join: {
          from: 'management_articles.id',
          through: {
            from: 'management_article_accounts.articleId',
            to: 'management_article_accounts.accountId',
          },
          to: 'accounts.id',
        },
      },
    };
  }
}
```

- [ ] **Step 2: Создать модель карты**

Create `packages/server/src/modules/ManagementArticles/models/ManagementArticleAccount.model.ts`:

```ts
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class ManagementArticleAccount extends TenantBaseModel {
  articleId!: number;
  accountId!: number;

  /**
   * Table name.
   */
  static get tableName() {
    return 'management_article_accounts';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
```

- [ ] **Step 3: Зарегистрировать модели в Tenancy**

In `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`:

Добавить импорты (рядом с другими import-ами моделей):

```ts
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
```

Добавить в массив `models` (перед `TenantUser`):

```ts
  PaymentReceivedEntry,
  ManagementArticle,
  ManagementArticleAccount,
  TenantUser,
];
```

- [ ] **Step 4: Проверка типов**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок (если `pnpm typecheck` целиком, сначала собрать `shared/` пакеты).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/models/ packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(server): add ManagementArticle models and register in tenancy"
```
Откат: `git checkout -- <files>`.

---

## Task A6: Константы ошибок, интерфейсы и DTO

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/constants.ts`
- Create: `packages/server/src/modules/ManagementArticles/ManagementArticle.interfaces.ts`
- Create: `packages/server/src/modules/ManagementArticles/dtos/ManagementArticle.dto.ts`
- Create: `packages/server/src/modules/ManagementArticles/dtos/GetManagementArticlesQuery.dto.ts`
- Create: `packages/server/src/modules/ManagementArticles/dtos/ManagementArticleResponse.dto.ts`

> DTO без отдельного unit-теста — проверяются typecheck-ом и тестами команд.

- [ ] **Step 1: Константы ошибок**

Create `packages/server/src/modules/ManagementArticles/constants.ts`:

```ts
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  ARTICLE_NAME_EXISTS: 'ARTICLE_NAME_EXISTS',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  PARENT_ARTICLE_NOT_FOUND: 'PARENT_ARTICLE_NOT_FOUND',
  ARTICLE_HAS_CHILDREN: 'ARTICLE_HAS_CHILDREN',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_ALREADY_MAPPED: 'ACCOUNT_ALREADY_MAPPED',
  INVALID_ARTICLE_KIND: 'INVALID_ARTICLE_KIND',
};

export const ARTICLE_KINDS = ['income', 'expense'] as const;
export const CASHFLOW_SECTIONS = [
  'operating',
  'investing',
  'financing',
] as const;
```

- [ ] **Step 2: Интерфейсы**

Create `packages/server/src/modules/ManagementArticles/ManagementArticle.interfaces.ts`:

```ts
import { ManagementArticle } from './models/ManagementArticle.model';

export interface GetManagementArticlesResponse {
  data: ManagementArticle[];
}
```

- [ ] **Step 3: Command/Create/Edit DTO**

Create `packages/server/src/modules/ManagementArticles/dtos/ManagementArticle.dto.ts`:

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { ARTICLE_KINDS, CASHFLOW_SECTIONS } from '../constants';

class CommandManagementArticleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Выручка', description: 'The article name' })
  name: string;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 1, description: 'Parent article id (nesting)' })
  parentId?: number;

  @IsString()
  @IsIn(ARTICLE_KINDS as unknown as string[])
  @ApiProperty({
    example: 'income',
    enum: ARTICLE_KINDS,
    description: 'Income or expense article',
  })
  kind: string;

  @IsString()
  @IsIn(CASHFLOW_SECTIONS as unknown as string[])
  @IsOptional()
  @ApiProperty({
    example: 'operating',
    enum: CASHFLOW_SECTIONS,
    description: 'Cash flow statement section (optional)',
  })
  cashflowSection?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiProperty({ example: 0, description: 'Sort order within the tree' })
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, description: 'Soft on/off switch' })
  active?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @ApiProperty({
    example: [1001, 1002],
    description: 'Account ids rolled up into this article',
    type: [Number],
  })
  accountIds?: number[];
}

export class CreateManagementArticleDto extends CommandManagementArticleDto {}
export class EditManagementArticleDto extends CommandManagementArticleDto {}
```

- [ ] **Step 4: Query DTO списка**

Create `packages/server/src/modules/ManagementArticles/dtos/GetManagementArticlesQuery.dto.ts`:

```ts
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsString } from 'class-validator';

export class GetManagementArticlesQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'income', description: 'Filter by kind' })
  kind?: string;

  @IsBooleanString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'true',
    description: 'Return as nested tree instead of flat list',
  })
  tree?: string;
}
```

- [ ] **Step 5: Response DTO**

Create `packages/server/src/modules/ManagementArticles/dtos/ManagementArticleResponse.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class ManagementArticleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Выручка' })
  name: string;

  @ApiProperty({ example: null, nullable: true })
  parentId: number | null;

  @ApiProperty({ example: 'income' })
  kind: string;

  @ApiProperty({ example: 'operating', nullable: true })
  cashflowSection: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  active: boolean;
}
```

- [ ] **Step 6: Проверка типов и commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

```bash
git add packages/server/src/modules/ManagementArticles/constants.ts packages/server/src/modules/ManagementArticles/ManagementArticle.interfaces.ts packages/server/src/modules/ManagementArticles/dtos/
git commit -m "feat(server): add ManagementArticle DTOs, interfaces and error constants"
```
Откат: `git checkout -- packages/server/src/modules/ManagementArticles/`.

---

## Task A7: Сервис-валидатор

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.ts`
- Test: `packages/server/src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.spec.ts`:

```ts
import { ServiceError } from '@/modules/Items/ServiceError';
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { ERRORS } from '../constants';

const queryStub = (result: any) => ({
  query: () => ({
    findOne: () => ({ onBuild: () => Promise.resolve(result) }),
    findById: (_id: number) => Promise.resolve(result),
    whereIn: () => ({ resultSize: () => Promise.resolve(result) }),
  }),
});

describe('CommandManagementArticleValidatorService', () => {
  it('throws when the article name already exists', async () => {
    const articleModel = () => queryStub({ id: 5, name: 'Выручка' });
    const accountModel = () => queryStub(null);
    const service = new CommandManagementArticleValidatorService(
      articleModel as any,
      accountModel as any,
    );

    await expect(
      service.validateNameUniqueness('Выручка'),
    ).rejects.toMatchObject({ errorType: ERRORS.ARTICLE_NAME_EXISTS });
  });

  it('passes when the article name is free', async () => {
    const articleModel = () => queryStub(null);
    const accountModel = () => queryStub(null);
    const service = new CommandManagementArticleValidatorService(
      articleModel as any,
      accountModel as any,
    );

    await expect(
      service.validateNameUniqueness('Аренда'),
    ).resolves.toBeUndefined();
  });
});
```

> `ServiceError` хранит код в свойстве `errorType` (проверено: `@/modules/Items/ServiceError` — `constructor(errorType, message?, payload?, httpStatus?)`, `httpStatus` по умолчанию `400`). Матчер проверяет именно `errorType`.

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать валидатор**

Create `packages/server/src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ERRORS } from '../constants';

@Injectable()
export class CommandManagementArticleValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Validates the article name is unique (optionally excluding one id).
   */
  public async validateNameUniqueness(name: string, notArticleId?: number) {
    const found = await this.articleModel()
      .query()
      .findOne('name', name)
      .onBuild((query) => {
        if (notArticleId) {
          query.whereNot('id', notArticleId);
        }
      });

    if (found) {
      throw new ServiceError(ERRORS.ARTICLE_NAME_EXISTS);
    }
  }

  /**
   * Validates the parent article exists (when parentId is given).
   */
  public async validateParentExists(parentId?: number) {
    if (!parentId) return;

    const parent = await this.articleModel().query().findById(parentId);
    if (!parent) {
      throw new ServiceError(ERRORS.PARENT_ARTICLE_NOT_FOUND);
    }
  }

  /**
   * Validates all given account ids exist.
   */
  public async validateAccountsExist(accountIds?: number[]) {
    if (!accountIds || accountIds.length === 0) return;

    const count = await this.accountModel()
      .query()
      .whereIn('id', accountIds)
      .resultSize();

    if (count !== accountIds.length) {
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
    }
  }

  /**
   * Validates none of the given accounts is already mapped to another article.
   * Enforces the v1 rule: one account belongs to exactly one article.
   */
  public async validateAccountsNotMapped(
    accountIds?: number[],
    ownArticleId?: number,
  ) {
    if (!accountIds || accountIds.length === 0) return;

    const conflicting = await this.articleAccountModel()
      .query()
      .whereIn('accountId', accountIds)
      .onBuild((query) => {
        if (ownArticleId) {
          query.whereNot('articleId', ownArticleId);
        }
      });

    if (conflicting.length > 0) {
      throw new ServiceError(ERRORS.ACCOUNT_ALREADY_MAPPED);
    }
  }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.ts packages/server/src/modules/ManagementArticles/commands/CommandManagementArticleValidator.service.spec.ts
git commit -m "feat(server): add ManagementArticle command validator"
```
Откат: `git checkout -- packages/server/src/modules/ManagementArticles/commands/`.

---

## Task A8: Команда создания статьи

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/commands/CreateManagementArticle.service.ts`
- Test: `packages/server/src/modules/ManagementArticles/commands/CreateManagementArticle.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/ManagementArticles/commands/CreateManagementArticle.service.spec.ts`:

```ts
import { CreateManagementArticleService } from './CreateManagementArticle.service';

describe('CreateManagementArticleService', () => {
  it('validates then inserts the article inside a transaction', async () => {
    const inserted = { id: 10, name: 'Аренда', kind: 'expense' };

    const insert = jest.fn().mockResolvedValue(inserted);
    const articleModel = () => ({ query: () => ({ insert }) });
    const articleAccountModel = () => ({ query: () => ({ insert: jest.fn() }) });

    const validator = {
      validateNameUniqueness: jest.fn().mockResolvedValue(undefined),
      validateParentExists: jest.fn().mockResolvedValue(undefined),
      validateAccountsExist: jest.fn().mockResolvedValue(undefined),
      validateAccountsNotMapped: jest.fn().mockResolvedValue(undefined),
    };
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new CreateManagementArticleService(
      uow as any,
      validator as any,
      articleModel as any,
      articleAccountModel as any,
    );

    const result = await service.create({
      name: 'Аренда',
      kind: 'expense',
    } as any);

    expect(validator.validateNameUniqueness).toHaveBeenCalledWith('Аренда');
    expect(insert).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/commands/CreateManagementArticle.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать команду**

Create `packages/server/src/modules/ManagementArticles/commands/CreateManagementArticle.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { CreateManagementArticleDto } from '../dtos/ManagementArticle.dto';

@Injectable()
export class CreateManagementArticleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandManagementArticleValidatorService,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Creates a management article and (optionally) maps accounts to it.
   * @param {CreateManagementArticleDto} dto
   * @param {Knex.Transaction} [trx]
   * @returns {Promise<ManagementArticle>}
   */
  public async create(
    dto: CreateManagementArticleDto,
    trx?: Knex.Transaction,
  ): Promise<ManagementArticle> {
    await this.validator.validateNameUniqueness(dto.name);
    await this.validator.validateParentExists(dto.parentId);
    await this.validator.validateAccountsExist(dto.accountIds);
    await this.validator.validateAccountsNotMapped(dto.accountIds);

    const { accountIds, ...articleData } = dto;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const article = await this.articleModel()
        .query(trx)
        .insert({ ...articleData });

      if (accountIds && accountIds.length > 0) {
        await this.articleAccountModel()
          .query(trx)
          .insert(
            accountIds.map((accountId) => ({
              articleId: article.id,
              accountId,
            })),
          );
      }

      return article;
    }, trx);
  }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/commands/CreateManagementArticle.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/commands/CreateManagementArticle.service.ts packages/server/src/modules/ManagementArticles/commands/CreateManagementArticle.service.spec.ts
git commit -m "feat(server): add CreateManagementArticle command"
```
Откат: `git checkout -- packages/server/src/modules/ManagementArticles/commands/`.

---

## Task A9: Команды правки и удаления

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/commands/EditManagementArticle.service.ts`
- Create: `packages/server/src/modules/ManagementArticles/commands/DeleteManagementArticle.service.ts`
- Test: `packages/server/src/modules/ManagementArticles/commands/DeleteManagementArticle.service.spec.ts`

- [ ] **Step 1: Написать падающий тест на удаление**

Create `packages/server/src/modules/ManagementArticles/commands/DeleteManagementArticle.service.spec.ts`:

```ts
import { ServiceError } from '@/modules/Items/ServiceError';
import { DeleteManagementArticleService } from './DeleteManagementArticle.service';
import { ERRORS } from '../constants';

describe('DeleteManagementArticleService', () => {
  it('refuses to delete an article that still has children', async () => {
    const articleModel = () => ({
      query: () => ({
        findById: () => Promise.resolve({ id: 1, name: 'Расходы' }),
        where: () => ({ resultSize: () => Promise.resolve(2) }),
      }),
    });
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new DeleteManagementArticleService(
      uow as any,
      articleModel as any,
    );

    await expect(service.delete(1)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_HAS_CHILDREN,
    });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/commands/DeleteManagementArticle.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать удаление**

Create `packages/server/src/modules/ManagementArticles/commands/DeleteManagementArticle.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteManagementArticleService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Deletes a management article. Mapped accounts are removed via ON DELETE
   * CASCADE on management_article_accounts. Refuses if the article has children.
   * @param {number} articleId
   */
  public async delete(articleId: number) {
    const article = await this.articleModel().query().findById(articleId);
    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }

    const childrenCount = await this.articleModel()
      .query()
      .where('parentId', articleId)
      .resultSize();

    if (childrenCount > 0) {
      throw new ServiceError(ERRORS.ARTICLE_HAS_CHILDREN);
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.articleModel().query(trx).deleteById(articleId);
    });
  }
}
```

- [ ] **Step 4: Реализовать правку**

Create `packages/server/src/modules/ManagementArticles/commands/EditManagementArticle.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { EditManagementArticleDto } from '../dtos/ManagementArticle.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditManagementArticleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandManagementArticleValidatorService,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Edits a management article and re-syncs its account mapping.
   * @param {number} articleId
   * @param {EditManagementArticleDto} dto
   * @returns {Promise<ManagementArticle>}
   */
  public async edit(
    articleId: number,
    dto: EditManagementArticleDto,
  ): Promise<ManagementArticle> {
    const existing = await this.articleModel().query().findById(articleId);
    if (!existing) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }

    await this.validator.validateNameUniqueness(dto.name, articleId);
    await this.validator.validateParentExists(dto.parentId);
    await this.validator.validateAccountsExist(dto.accountIds);
    await this.validator.validateAccountsNotMapped(dto.accountIds, articleId);

    const { accountIds, ...articleData } = dto;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const article = await this.articleModel()
        .query(trx)
        .patchAndFetchById(articleId, { ...articleData });

      // Re-sync mapping only when accountIds was explicitly provided.
      if (accountIds) {
        await this.articleAccountModel()
          .query(trx)
          .where('articleId', articleId)
          .delete();

        if (accountIds.length > 0) {
          await this.articleAccountModel()
            .query(trx)
            .insert(
              accountIds.map((accountId) => ({ articleId, accountId })),
            );
        }
      }

      return article;
    });
  }
}
```

- [ ] **Step 5: Запустить тест удаления — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/commands/DeleteManagementArticle.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/commands/EditManagementArticle.service.ts packages/server/src/modules/ManagementArticles/commands/DeleteManagementArticle.service.ts packages/server/src/modules/ManagementArticles/commands/DeleteManagementArticle.service.spec.ts
git commit -m "feat(server): add Edit/Delete ManagementArticle commands"
```
Откат: `git checkout -- packages/server/src/modules/ManagementArticles/commands/`.

---

## Task A10: Запросы (одна статья + список/дерево)

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/queries/GetManagementArticle.service.ts`
- Create: `packages/server/src/modules/ManagementArticles/queries/GetManagementArticles.service.ts`
- Test: `packages/server/src/modules/ManagementArticles/queries/GetManagementArticles.service.spec.ts`

- [ ] **Step 1: Написать падающий тест списка/дерева**

Create `packages/server/src/modules/ManagementArticles/queries/GetManagementArticles.service.spec.ts`:

```ts
import { GetManagementArticlesService } from './GetManagementArticles.service';

describe('GetManagementArticlesService', () => {
  const flat = [
    { id: 1, name: 'Доходы', parentId: null },
    { id: 2, name: 'Выручка', parentId: 1 },
  ];

  const buildService = () => {
    const articleModel = () => ({
      query: () => ({
        orderBy: () => Promise.resolve(flat),
      }),
    });
    return new GetManagementArticlesService(articleModel as any);
  };

  it('returns a flat list by default', async () => {
    const res = await buildService().getManagementArticles({});
    expect(res.data).toHaveLength(2);
    expect(res.data[0].children).toBeUndefined();
  });

  it('returns a nested tree when tree=true', async () => {
    const res = await buildService().getManagementArticles({ tree: 'true' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].children).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/queries/GetManagementArticles.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать список/дерево**

Create `packages/server/src/modules/ManagementArticles/queries/GetManagementArticles.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { GetManagementArticlesQueryDto } from '../dtos/GetManagementArticlesQuery.dto';
import { GetManagementArticlesResponse } from '../ManagementArticle.interfaces';
import { buildArticleTree } from '../utils/buildArticleTree';

@Injectable()
export class GetManagementArticlesService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Retrieves management articles as a flat list or nested tree.
   * @param {GetManagementArticlesQueryDto} filterDto
   * @returns {Promise<GetManagementArticlesResponse>}
   */
  public async getManagementArticles(
    filterDto: GetManagementArticlesQueryDto,
  ): Promise<GetManagementArticlesResponse> {
    const articles = await this.articleModel()
      .query()
      .onBuild((query) => {
        if (filterDto.kind) {
          query.where('kind', filterDto.kind);
        }
        query.orderBy('sortOrder', 'asc');
      });

    const data =
      filterDto.tree === 'true'
        ? (buildArticleTree(articles) as unknown as ManagementArticle[])
        : articles;

    return { data };
  }
}
```

> Если в Step 1 stub использовал `orderBy` без `onBuild`, при реализации тест может потребовать выровнять stub под фактическую цепочку (`query().onBuild(...)`). Подгоните stub в тесте так, чтобы он возвращал `flat` из терминального вызова — суть теста (flat vs tree) сохраняется.

- [ ] **Step 4: Реализовать получение одной статьи**

Create `packages/server/src/modules/ManagementArticles/queries/GetManagementArticle.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetManagementArticleService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Retrieves a single management article with its mapped accounts.
   * @param {number} articleId
   * @returns {Promise<ManagementArticle>}
   */
  public async getManagementArticle(
    articleId: number,
  ): Promise<ManagementArticle> {
    const article = await this.articleModel()
      .query()
      .findById(articleId)
      .withGraphFetched('accounts');

    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }
    return article;
  }
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/queries/GetManagementArticles.service.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/queries/
git commit -m "feat(server): add ManagementArticle query services (list/tree/single)"
```
Откат: `git checkout -- packages/server/src/modules/ManagementArticles/queries/`.

---

## Task A11: Application, Controller, Module + регистрация в App

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/ManagementArticles.application.ts`
- Create: `packages/server/src/modules/ManagementArticles/ManagementArticles.controller.ts`
- Create: `packages/server/src/modules/ManagementArticles/ManagementArticles.module.ts`
- Modify: `packages/server/src/modules/App/App.module.ts`

- [ ] **Step 1: Application (фасад)**

Create `packages/server/src/modules/ManagementArticles/ManagementArticles.application.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CreateManagementArticleService } from './commands/CreateManagementArticle.service';
import { EditManagementArticleService } from './commands/EditManagementArticle.service';
import { DeleteManagementArticleService } from './commands/DeleteManagementArticle.service';
import { GetManagementArticleService } from './queries/GetManagementArticle.service';
import { GetManagementArticlesService } from './queries/GetManagementArticles.service';
import {
  CreateManagementArticleDto,
  EditManagementArticleDto,
} from './dtos/ManagementArticle.dto';
import { GetManagementArticlesQueryDto } from './dtos/GetManagementArticlesQuery.dto';

@Injectable()
export class ManagementArticlesApplication {
  constructor(
    private readonly createService: CreateManagementArticleService,
    private readonly editService: EditManagementArticleService,
    private readonly deleteService: DeleteManagementArticleService,
    private readonly getService: GetManagementArticleService,
    private readonly getListService: GetManagementArticlesService,
  ) {}

  public createManagementArticle(dto: CreateManagementArticleDto) {
    return this.createService.create(dto);
  }

  public editManagementArticle(id: number, dto: EditManagementArticleDto) {
    return this.editService.edit(id, dto);
  }

  public deleteManagementArticle(id: number) {
    return this.deleteService.delete(id);
  }

  public getManagementArticle(id: number) {
    return this.getService.getManagementArticle(id);
  }

  public getManagementArticles(filterDto: GetManagementArticlesQueryDto) {
    return this.getListService.getManagementArticles(filterDto);
  }
}
```

- [ ] **Step 2: Controller**

Create `packages/server/src/modules/ManagementArticles/ManagementArticles.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ManagementArticlesApplication } from './ManagementArticles.application';
import {
  CreateManagementArticleDto,
  EditManagementArticleDto,
} from './dtos/ManagementArticle.dto';
import { GetManagementArticlesQueryDto } from './dtos/GetManagementArticlesQuery.dto';
import { ManagementArticleResponseDto } from './dtos/ManagementArticleResponse.dto';

@Controller('management-articles')
@ApiTags('Management Articles')
@ApiExtraModels(ManagementArticleResponseDto)
@ApiCommonHeaders()
export class ManagementArticlesController {
  constructor(
    private readonly application: ManagementArticlesApplication,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new management article.' })
  createManagementArticle(@Body() dto: CreateManagementArticleDto) {
    return this.application.createManagementArticle(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves management articles (flat or tree).' })
  @ApiResponse({
    status: 200,
    description: 'The management articles have been retrieved.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(ManagementArticleResponseDto) },
    },
  })
  getManagementArticles(@Query() filterDto: GetManagementArticlesQueryDto) {
    return this.application.getManagementArticles(filterDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit the given management article.' })
  editManagementArticle(
    @Param('id') id: number,
    @Body() dto: EditManagementArticleDto,
  ) {
    return this.application.editManagementArticle(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieves a management article details.' })
  @ApiResponse({
    status: 200,
    description: 'The management article details have been retrieved.',
    schema: { $ref: getSchemaPath(ManagementArticleResponseDto) },
  })
  getManagementArticle(@Param('id') id: number) {
    return this.application.getManagementArticle(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the given management article.' })
  deleteManagementArticle(@Param('id') id: number) {
    return this.application.deleteManagementArticle(id);
  }
}
```

- [ ] **Step 3: Module**

Create `packages/server/src/modules/ManagementArticles/ManagementArticles.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '../Tenancy/TenancyDB/TenancyDB.module';
import { ManagementArticlesController } from './ManagementArticles.controller';
import { ManagementArticlesApplication } from './ManagementArticles.application';
import { CommandManagementArticleValidatorService } from './commands/CommandManagementArticleValidator.service';
import { CreateManagementArticleService } from './commands/CreateManagementArticle.service';
import { EditManagementArticleService } from './commands/EditManagementArticle.service';
import { DeleteManagementArticleService } from './commands/DeleteManagementArticle.service';
import { GetManagementArticleService } from './queries/GetManagementArticle.service';
import { GetManagementArticlesService } from './queries/GetManagementArticles.service';

@Module({
  imports: [TenancyDatabaseModule],
  controllers: [ManagementArticlesController],
  providers: [
    ManagementArticlesApplication,
    CommandManagementArticleValidatorService,
    CreateManagementArticleService,
    EditManagementArticleService,
    DeleteManagementArticleService,
    GetManagementArticleService,
    GetManagementArticlesService,
  ],
})
export class ManagementArticlesModule {}
```

- [ ] **Step 4: Зарегистрировать модуль в App.module**

In `packages/server/src/modules/App/App.module.ts`:

Импорт (рядом с `import { ItemCategoryModule } …`):

```ts
import { ManagementArticlesModule } from '../ManagementArticles/ManagementArticles.module';
```

В массив `imports` модуля (рядом с `ItemCategoryModule,`):

```ts
    ItemCategoryModule,
    ManagementArticlesModule,
```

- [ ] **Step 5: Проверка типов + полный прогон тестов модуля**

Run:
```bash
pnpm --filter @bigfin/server typecheck
pnpm --filter @bigfin/server test -- src/modules/ManagementArticles
```
Expected: typecheck без ошибок; все спеки модуля зелёные.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/ManagementArticles.application.ts packages/server/src/modules/ManagementArticles/ManagementArticles.controller.ts packages/server/src/modules/ManagementArticles/ManagementArticles.module.ts packages/server/src/modules/App/App.module.ts
git commit -m "feat(server): wire ManagementArticles module (application/controller/module)"
```
Откат: `git checkout -- <files>` (модуль перестанет регистрироваться).

---

# Part B — Сид и свёртка «счёт→статья»

## Task B1: Свёртка «счёт→статья» (факт по статьям)

**Files:**
- Create: `packages/server/src/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts`
- Create: `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts`
- Test: `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts`
- Modify: `packages/server/src/modules/ManagementArticles/ManagementArticles.application.ts`
- Modify: `packages/server/src/modules/ManagementArticles/ManagementArticles.controller.ts`
- Modify: `packages/server/src/modules/ManagementArticles/ManagementArticles.module.ts`

> **Это самый рискованный кусок (риск №1 спеки).** Инвариант: сумма по статьям == сумма по сопоставленным счетам. Чистую часть фолдинга выносим в тестируемую функцию.

- [ ] **Step 1: Написать падающий тест фолдинга**

Create `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts`:

```ts
import { foldAccountsIntoArticles } from './ArticlesPlRollup.service';

describe('foldAccountsIntoArticles', () => {
  const articles = [
    { id: 1, name: 'Выручка', kind: 'income' },
    { id: 2, name: 'Аренда', kind: 'expense' },
  ];
  // accountId -> articleId
  const map = [
    { accountId: 100, articleId: 1 },
    { accountId: 101, articleId: 1 },
    { accountId: 200, articleId: 2 },
  ];
  // net per account (credit - debit)
  const accountNets = [
    { accountId: 100, net: 300 },
    { accountId: 101, net: 200 },
    { accountId: 200, net: -150 },
    { accountId: 999, net: 50 }, // unmapped — must be ignored
  ];

  it('sums account nets into their article', () => {
    const result = foldAccountsIntoArticles(articles, map, accountNets);

    const revenue = result.find((a) => a.id === 1);
    const rent = result.find((a) => a.id === 2);

    expect(revenue.amount).toBe(500); // 300 + 200
    expect(rent.amount).toBe(-150);
  });

  it('article total equals sum of its mapped account nets (invariant)', () => {
    const result = foldAccountsIntoArticles(articles, map, accountNets);

    const mappedAccountIds = new Set(map.map((m) => m.accountId));
    const mappedTotal = accountNets
      .filter((a) => mappedAccountIds.has(a.accountId))
      .reduce((sum, a) => sum + a.net, 0);
    const articlesTotal = result.reduce((sum, a) => sum + a.amount, 0);

    expect(articlesTotal).toBe(mappedTotal); // 350
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts`
Expected: FAIL — функция не найдена.

- [ ] **Step 3: DTO фильтра свёртки**

Create `packages/server/src/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';

export class ArticlesRollupQueryDto extends FinancialSheetBranchesQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01', description: 'From date' })
  fromDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'To date' })
  toDate?: string;
}
```

- [ ] **Step 4: Реализовать сервис + чистую функцию**

Create `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ArticlesRollupQueryDto } from '../dtos/ArticlesRollupQuery.dto';

interface ArticleRollupRow {
  id: number;
  name: string;
  kind: string;
  amount: number;
  [key: string]: any;
}

/**
 * Pure fold: distribute per-account nets into their mapped articles.
 * Accounts without a mapping are ignored (kept off the management report).
 * @param {Array} articles
 * @param {Array<{ accountId: number; articleId: number }>} map
 * @param {Array<{ accountId: number; net: number }>} accountNets
 * @returns {ArticleRollupRow[]}
 */
export function foldAccountsIntoArticles(
  articles: any[],
  map: { accountId: number; articleId: number }[],
  accountNets: { accountId: number; net: number }[],
): ArticleRollupRow[] {
  const accountToArticle = new Map<number, number>();
  map.forEach((m) => accountToArticle.set(m.accountId, m.articleId));

  const totals = new Map<number, number>();
  articles.forEach((a) => totals.set(a.id, 0));

  accountNets.forEach(({ accountId, net }) => {
    const articleId = accountToArticle.get(accountId);
    if (articleId == null) return; // unmapped account
    totals.set(articleId, (totals.get(articleId) ?? 0) + net);
  });

  return articles.map((a) => ({ ...a, amount: totals.get(a.id) ?? 0 }));
}

@Injectable()
export class ArticlesPlRollupService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Builds the management "P&L by articles" rollup for a date range / branches.
   * Fact is computed per account (credit - debit), then folded into articles
   * by the management_article_accounts map.
   * @param {ArticlesRollupQueryDto} query
   * @returns {Promise<ArticleRollupRow[]>}
   */
  public async getRollup(query: ArticlesRollupQueryDto) {
    const articles = await this.articleModel().query().orderBy('sortOrder');
    const map = await this.articleAccountModel().query();

    const accountTotals = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('accountId');
        qb.select(['accountId']);

        if (query.fromDate && query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
        if (!isEmpty(query.branchesIds)) {
          qb.modify('filterByBranches', query.branchesIds);
        }
      });

    const accountNets = accountTotals.map((row: any) => ({
      accountId: row.accountId,
      net: Number(row.credit ?? 0) - Number(row.debit ?? 0),
    }));

    return foldAccountsIntoArticles(articles, map, accountNets);
  }
}
```

> Публичный метод сервиса — `getRollup`; его вызывает `ManagementArticlesApplication.getArticlesPlRollup`. Юнит-тест проверяет чистую функцию `foldAccountsIntoArticles` — она не зависит от инъекций моделей, поэтому тестируется без NestJS-контейнера.

- [ ] **Step 5: Подключить сервис в module/application/controller**

In `ManagementArticles.module.ts` — добавить в `providers` импорт и класс `ArticlesPlRollupService`.

In `ManagementArticles.application.ts` — добавить в конструктор `private readonly rollupService: ArticlesPlRollupService` и метод:

```ts
  public getArticlesPlRollup(query: ArticlesRollupQueryDto) {
    return this.rollupService.getRollup(query);
  }
```
(+ импорты `ArticlesPlRollupService` и `ArticlesRollupQueryDto`.)

In `ManagementArticles.controller.ts` — добавить эндпоинт (выше `@Put(':id')`, чтобы маршрут `pl-rollup` не перехватывался `:id`):

```ts
  @Get('pl-rollup')
  @ApiOperation({ summary: 'Management P&L rolled up by articles.' })
  getArticlesPlRollup(@Query() query: ArticlesRollupQueryDto) {
    return this.application.getArticlesPlRollup(query);
  }
```
(+ импорт `ArticlesRollupQueryDto`.)

- [ ] **Step 6: Запустить тест фолдинга + typecheck**

Run:
```bash
pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts
pnpm --filter @bigfin/server typecheck
```
Expected: оба теста PASS; typecheck без ошибок.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts packages/server/src/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts packages/server/src/modules/ManagementArticles/ManagementArticles.application.ts packages/server/src/modules/ManagementArticles/ManagementArticles.controller.ts packages/server/src/modules/ManagementArticles/ManagementArticles.module.ts
git commit -m "feat(server): add account-to-article P&L rollup with invariant test"
```
Откат: `git checkout -- <files>`.

---

## Task B2: Сид дефолтного RU-дерева статей

**Files:**
- Create: `packages/server/src/database/tenant/seeds/data/managementArticles.ts`
- Create: `packages/server/src/database/tenant/seeds/core/20260529120200_seed_management_articles.ts`

> Сид кладёт **дефолтное RU-дерево** для новой организации (спека §5.1). Названия — обычные RU-строки (это данные-по-умолчанию, которые пользователь потом переименовывает, как и дефолтные счета). Карта «статья↔счёт» здесь не наполняется автоматически (коды счетов RU-плана финализируются в ②b роадмапа) — это явная граница, см. «Out of scope».

- [ ] **Step 1: Данные дерева**

Create `packages/server/src/database/tenant/seeds/data/managementArticles.ts`:

```ts
/**
 * Default RU management-article tree for a new organization.
 * `key` is a local reference used only to resolve parentId during seeding.
 */
export const ManagementArticlesData = [
  { key: 'income', name: 'Доходы', parent: null, kind: 'income', cashflow_section: 'operating', sort_order: 1 },
  { key: 'revenue', name: 'Выручка', parent: 'income', kind: 'income', cashflow_section: 'operating', sort_order: 1 },

  { key: 'expense', name: 'Расходы', parent: null, kind: 'expense', cashflow_section: 'operating', sort_order: 2 },
  { key: 'cogs', name: 'Себестоимость', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 1 },
  { key: 'rent', name: 'Аренда', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 2 },
  { key: 'payroll', name: 'ФОТ', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 3 },
  { key: 'marketing', name: 'Маркетинг', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 4 },
  { key: 'taxes', name: 'Налоги', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 5 },
  { key: 'other', name: 'Прочее', parent: 'expense', kind: 'expense', cashflow_section: 'operating', sort_order: 6 },
];
```

- [ ] **Step 2: Сид**

Create `packages/server/src/database/tenant/seeds/core/20260529120200_seed_management_articles.ts`:

```ts
import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';
import { ManagementArticlesData } from '../data/managementArticles';

export default class SeedManagementArticles extends TenantSeeder {
  /**
   * Seeds the default RU management-article tree to the organization.
   * Parents are inserted first, then children resolve parentId by `key`.
   */
  async up(knex) {
    const now = new Date();
    const keyToId: Record<string, number> = {};

    // Insert roots first, then children (data is ordered roots-before-children).
    for (const article of ManagementArticlesData) {
      const [row] = await knex('management_articles')
        .insert({
          name: article.name,
          parent_id: article.parent ? keyToId[article.parent] : null,
          kind: article.kind,
          cashflow_section: article.cashflow_section,
          sort_order: article.sort_order,
          active: true,
          created_at: now,
          updated_at: now,
        })
        .returning('id');

      keyToId[article.key] = typeof row === 'object' ? row.id : row;
    }
  }
}
```

- [ ] **Step 3: Проверить сид на свежей tenant-БД**

> Сиды ядра берутся из каталога `database/tenant/seeds/core` (конфиг `tenantDatabase.seedsDir`) и запускаются при создании организации. Прогнать в порядке: миграции `latest` → запуск core-сидов.

Run (после `pnpm tenants:migrate:latest`):
```bash
pnpm --filter @bigfin/server test -- src/modules/ManagementArticles
```
Затем ручная проверка вставки (если поднята БД): создать тестовую организацию / выполнить core seed и убедиться, что в `management_articles` 9 строк, у дочерних заполнен `parent_id`.

Expected: дерево из 9 статей; 2 корня (`Доходы`, `Расходы`), у `Расходов` — 6 детей, у `Доходов` — 1.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/database/tenant/seeds/data/managementArticles.ts packages/server/src/database/tenant/seeds/core/20260529120200_seed_management_articles.ts
git commit -m "feat(server): seed default RU management-article tree"
```
Откат: `git checkout -- <files>`; для уже засеянной БД — удалить строки вручную или пересоздать tenant-БД.

---

# Part C — Frontend: дерево статей (новый стек)

## Task C1: i18n-ключи (EN + RU)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи через скилл**

Используйте скилл `i18n-add-string` для каждого ключа (он правит en/ru и держит парность). Набор ключей и значений:

| key | en | ru |
|---|---|---|
| `management_articles.page_title` | Management articles | Статьи учёта |
| `management_articles.label` | Articles | Статьи |
| `management_articles.add` | Add article | Добавить статью |
| `management_articles.edit` | Edit article | Изменить статью |
| `management_articles.delete` | Delete | Удалить |
| `management_articles.delete_confirm` | Delete this article? | Удалить эту статью? |
| `management_articles.field.name` | Name | Название |
| `management_articles.field.parent` | Parent article | Родительская статья |
| `management_articles.field.kind` | Kind | Тип |
| `management_articles.kind.income` | Income | Доход |
| `management_articles.kind.expense` | Expense | Расход |
| `management_articles.field.cashflow_section` | Cash flow section | Раздел ДДС |
| `management_articles.cashflow_section.operating` | Operating | Операционная |
| `management_articles.cashflow_section.investing` | Investing | Инвестиционная |
| `management_articles.cashflow_section.financing` | Financing | Финансовая |
| `management_articles.field.accounts` | Accounts | Счета |
| `management_articles.save` | Save | Сохранить |
| `management_articles.cancel` | Cancel | Отмена |
| `management_articles.error.name_required` | Enter the article name | Введите название статьи |
| `management_articles.error.kind_required` | Choose income or expense | Выберите доход или расход |
| `management_articles.saved` | Article saved | Статья сохранена |
| `management_articles.deleted` | Article deleted | Статья удалена |

- [ ] **Step 2: Проверка парности**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: 0 расхождений EN↔RU.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): add management articles i18n keys (en/ru)"
```
Откат: `git checkout -- packages/webapp/src/lang/`.

---

## Task C2: React Query хуки

**Files:**
- Modify: `packages/webapp/src/hooks/query/types.tsx`
- Create: `packages/webapp/src/hooks/query/managementArticles.tsx`

- [ ] **Step 1: Добавить ключи запросов**

In `packages/webapp/src/hooks/query/types.tsx`:

Добавить группу (рядом с другими `const … = { … }`):

```ts
const MANAGEMENT_ARTICLES = {
  MANAGEMENT_ARTICLES: 'MANAGEMENT_ARTICLES',
  MANAGEMENT_ARTICLE: 'MANAGEMENT_ARTICLE',
  MANAGEMENT_ARTICLES_PL_ROLLUP: 'MANAGEMENT_ARTICLES_PL_ROLLUP',
};
```

Добавить в `export default { … }`:

```ts
  ...MANAGEMENT_ARTICLES,
};
```

- [ ] **Step 2: Создать хуки**

Create `packages/webapp/src/hooks/query/managementArticles.tsx`:

```tsx
// @ts-nocheck
import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

const commonInvalidate = (client) => {
  client.invalidateQueries(t.MANAGEMENT_ARTICLES);
  client.invalidateQueries(t.MANAGEMENT_ARTICLE);
  client.invalidateQueries(t.MANAGEMENT_ARTICLES_PL_ROLLUP);
};

/**
 * Retrieve management articles (flat or tree via query.tree = 'true').
 */
export function useManagementArticles(query, props) {
  return useRequestQuery(
    [t.MANAGEMENT_ARTICLES, query],
    { method: 'get', url: 'management-articles', params: query },
    {
      select: (res) => res.data.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Retrieve a single management article.
 */
export function useManagementArticle(id, props) {
  return useRequestQuery(
    [t.MANAGEMENT_ARTICLE, id],
    { method: 'get', url: `management-articles/${id}` },
    {
      select: (res) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Create a management article.
 */
export function useCreateManagementArticle(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) => apiRequest.post('management-articles', values),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}

/**
 * Edit the given management article.
 */
export function useEditManagementArticle(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]) => apiRequest.put(`management-articles/${id}`, values),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}

/**
 * Delete the given management article.
 */
export function useDeleteManagementArticle(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.delete(`management-articles/${id}`), {
    onSuccess: () => commonInvalidate(client),
    ...props,
  });
}
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @bigfin/webapp typecheck` (или `pnpm typecheck` после сборки `shared/`)
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/managementArticles.tsx
git commit -m "feat(webapp): add management articles React Query hooks"
```
Откат: `git checkout -- packages/webapp/src/hooks/query/`.

---

## Task C3: Zod-схема формы

**Files:**
- Create: `packages/webapp/src/containers/ManagementArticles/schemas.ts`

- [ ] **Step 1: Создать схему**

Create `packages/webapp/src/containers/ManagementArticles/schemas.ts`:

```ts
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getArticleFormSchema = () =>
  z.object({
    name: z
      .string()
      .min(1, intl.get('management_articles.error.name_required')),
    kind: z.enum(['income', 'expense'], {
      errorMap: () => ({
        message: intl.get('management_articles.error.kind_required'),
      }),
    }),
    cashflowSection: z
      .enum(['operating', 'investing', 'financing'])
      .optional()
      .or(z.literal('')),
    parentId: z.union([z.number(), z.null()]).optional(),
  });

export type ArticleFormValues = z.infer<ReturnType<typeof getArticleFormSchema>>;
```

> Схема — фабрика (`getArticleFormSchema()`), чтобы `intl.get` вычислялся в рантайме после инициализации локали (а не на этапе импорта модуля).

- [ ] **Step 2: Проверка типов + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

```bash
git add packages/webapp/src/containers/ManagementArticles/schemas.ts
git commit -m "feat(webapp): add management article form Zod schema"
```
Откат: `git checkout -- packages/webapp/src/containers/ManagementArticles/`.

---

## Task C4: Дерево + страница + диалог формы

**Files:**
- Create: `packages/webapp/src/containers/ManagementArticles/ArticleTree.tsx`
- Create: `packages/webapp/src/containers/ManagementArticles/ArticleFormDialog.tsx`
- Create: `packages/webapp/src/containers/ManagementArticles/ManagementArticlesPage.tsx`

> Драг-н-дроп переупорядочивание дерева в v1 **не делаем** (react-sortablejs v2 — плоский; вложенный DnD — отдельная задача). v1: показ дерева + создание/правка/удаление + выбор родителя в форме. Это явная граница, см. «Out of scope».

- [ ] **Step 1: Рекурсивный рендер дерева**

Create `packages/webapp/src/containers/ManagementArticles/ArticleTree.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface ArticleTreeProps {
  nodes: any[];
  level?: number;
  onEdit: (article: any) => void;
  onDelete: (article: any) => void;
}

export function ArticleTree({
  nodes,
  level = 0,
  onEdit,
  onDelete,
}: ArticleTreeProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground">
                {intl.get(`management_articles.kind.${node.kind}`)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={intl.get('management_articles.edit')}
                onClick={() => onEdit(node)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={intl.get('management_articles.delete')}
                onClick={() => onDelete(node)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>
          {node.children && node.children.length > 0 && (
            <ArticleTree
              nodes={node.children}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
```

> Импорты `@/components/ui/button` и иконки `lucide-react` подтверждены референсом нового стека (`components/auth/ResetPasswordPage.tsx`). Если конкретного `ui/button` варианта/иконки нет — взять ближайший доступный примитив из `components/ui/` (проверить перед вставкой).

- [ ] **Step 2: Диалог формы (создание/правка)**

Create `packages/webapp/src/containers/ManagementArticles/ArticleFormDialog.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getArticleFormSchema } from './schemas';
import {
  useCreateManagementArticle,
  useEditManagementArticle,
} from '@/hooks/query/managementArticles';

interface ArticleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: any; // when set — edit mode
}

export function ArticleFormDialog({
  open,
  onOpenChange,
  article,
}: ArticleFormDialogProps) {
  const isEdit = !!article?.id;
  const createMutation = useCreateManagementArticle();
  const editMutation = useEditManagementArticle();

  const form = useForm({
    resolver: zodResolver(getArticleFormSchema()),
    defaultValues: {
      name: article?.name ?? '',
      kind: article?.kind ?? 'expense',
      cashflowSection: article?.cashflowSection ?? '',
      parentId: article?.parentId ?? null,
    },
  });

  const onSubmit = async (values: any) => {
    const payload = {
      ...values,
      cashflowSection: values.cashflowSection || undefined,
    };
    try {
      if (isEdit) {
        await editMutation.mutateAsync([article.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('management_articles.saved'));
      onOpenChange(false);
    } catch (e) {
      // global error interceptor handles HTTP errors; nothing to swallow here
      throw e;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {intl.get(
              isEdit
                ? 'management_articles.edit'
                : 'management_articles.add',
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('management_articles.field.name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('management_articles.field.kind')}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">
                        {intl.get('management_articles.kind.income')}
                      </SelectItem>
                      <SelectItem value="expense">
                        {intl.get('management_articles.kind.expense')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {intl.get('management_articles.cancel')}
              </Button>
              <Button type="submit">
                {intl.get('management_articles.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

> Точные имена примитивов (`Dialog`, `Select`, `Form…`) проверить в `packages/webapp/src/components/ui/` перед вставкой — взять фактически существующие экспорты.

- [ ] **Step 3: Страница**

Create `packages/webapp/src/containers/ManagementArticles/ManagementArticlesPage.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ArticleTree } from './ArticleTree';
import { ArticleFormDialog } from './ArticleFormDialog';
import {
  useManagementArticles,
  useDeleteManagementArticle,
} from '@/hooks/query/managementArticles';

export default function ManagementArticlesPage() {
  const { data: tree } = useManagementArticles({ tree: 'true' });
  const deleteMutation = useDeleteManagementArticle();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (article: any) => {
    setEditing(article);
    setDialogOpen(true);
  };
  const onDelete = (article: any) => {
    if (window.confirm(intl.get('management_articles.delete_confirm'))) {
      deleteMutation.mutate(article.id);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('management_articles.page_title')}
        </h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {intl.get('management_articles.add')}
        </Button>
      </div>

      <ArticleTree nodes={tree} onEdit={openEdit} onDelete={onDelete} />

      <ArticleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        article={editing}
      />
    </div>
  );
}
```

- [ ] **Step 4: Проверка типов + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок (поправить импорты примитивов под фактические экспорты `components/ui`).

```bash
git add packages/webapp/src/containers/ManagementArticles/
git commit -m "feat(webapp): add management articles tree page and form dialog"
```
Откат: `git checkout -- packages/webapp/src/containers/ManagementArticles/`.

---

## Task C5: Маршрут + гейтинг по фиче

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`

- [ ] **Step 1: Показать текущий фрагмент**

Открыть `packages/webapp/src/routes/dashboard.tsx`, найти массив маршрутов (объекты `{ path, component: lazy(...), breadcrumb, pageTitle, subscriptionActive }`). Показать соседний пример (напр. маршрут accounts) до правки.

- [ ] **Step 2: Добавить маршрут**

Добавить элемент в массив маршрутов:

```tsx
  {
    path: '/management-articles',
    component: lazy(
      () =>
        import('@/containers/ManagementArticles/ManagementArticlesPage'),
    ),
    breadcrumb: intl.get('management_articles.page_title'),
    pageTitle: intl.get('management_articles.page_title'),
    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
  },
```

(Если `lazy`, `intl`, `SUBSCRIPTION_TYPE` уже импортированы в файле — новые импорты не нужны; иначе добавить по образцу соседних маршрутов.)

- [ ] **Step 3: Гейтинг по фиче в навигации**

В месте, где формируется пункт меню/ссылка на страницу (sidebar), обернуть видимость через хук фичи:

```tsx
import { useFeatureCan } from '@/hooks/state/feature';
// ...
const { featureCan } = useFeatureCan();
// показывать пункт «Статьи учёта», только если фича включена:
{featureCan('mgmt_articles') && (
  /* <NavLink to="/management-articles">…</NavLink> по образцу соседних пунктов */
)}
```

> Строка флага — ровно `'mgmt_articles'` (значение `Features.MGMT_ARTICLES` с сервера). Сам маршрут можно оставить доступным по прямому URL — основной гейт визуальный, в пункте меню; backend по умолчанию пуст (флаг off → пункт скрыт → пользователь не создаёт статей).

- [ ] **Step 4: Проверка типов + dev-прогон**

Run:
```bash
pnpm --filter @bigfin/webapp typecheck
pnpm dev:webapp
```
Expected: typecheck без ошибок; dev-сборка стартует без ошибок маршрута. (Полный UI-прогон требует backend — здесь достаточно сборки и навигации до гейта.)

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(webapp): add management articles route gated by mgmt_articles feature"
```
Откат: `git checkout -- packages/webapp/src/routes/dashboard.tsx`.

---

## Финальная проверка этапа

- [x] **Backend:** `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles` — все спеки зелёные. ✅ (повторно 2026-05-30: 6 спек / 32 теста)
- [x] **Типы:** `pnpm typecheck` (после сборки `shared/`) — без ошибок. ✅ (повторно 2026-05-30: 3 проекта, 0 ошибок)
- [ ] **Миграции:** `latest → rollback → latest` для обеих новых таблиц — без ошибок. ⏳ **Отложено** — нет локальной БД; прогнать в CI / при поднятом окружении (миграции additive, `down()` рабочие).
- [x] **i18n:** `node packages/webapp/scripts/lang-check.js` — 0 расхождений. ✅ (повторно 2026-05-30: 2489 = 2489)
- [x] **Инвариант свёртки:** тест `ArticlesPlRollup.service.spec.ts` (статьи == сумма счетов) зелёный. ✅
- [x] **Флаг:** `mgmt_articles` по умолчанию `false`; включается через `FeaturesManager.turnOn('mgmt_articles')` на нужной организации. ✅ (`FeaturesConfigure.spec.ts` зелёный)

---

## Out of scope (этого плана) / следующие шаги

- **Интеграция статей в существующие отчёты ОПиУ/ДДС** (table/PDF/Excel-инъекторы `FinancialStatements`) — в v1 свёртка отдаётся отдельным эндпоинтом `GET /management-articles/pl-rollup`. Глубокая замена группировки «по счетам» на «по статьям» в готовых экспортерах — отдельный следующий шаг внутри ④.
- **Автозаполнение карты «статья↔счёт» в сиде** — ждёт финального RU-плана счетов (②b роадмапа). Пока карта наполняется вручную через форму статьи.
- **Drag-and-drop переупорядочивание/вложение дерева** — react-sortablejs v2 плоский; вложенный DnD — отдельная задача. v1 меняет `parentId`/`sortOrder` через форму.
- **Направления (`branch_id`) в режиме «Бизнес»** — лейбл «Направление» и фильтры по направлению на отчётах подключаются вместе с ③ (режимы) — отдельный шаг.
- **Этапы 1–3** (платёжный календарь, бюджеты, план-факт) — отдельные планы, пишутся при достижении (зависят от Этапа 0).

---

## Self-review (выполнено при написании плана)

**1. Покрытие спеки (§6 Этап 0).** ✔ `management_articles` (A2) + `management_article_accounts` (A3); ✔ модели (A5); ✔ CRUD-дерево (A6–A11); ✔ сид RU-дерева (B2); ✔ свёртка «счёт→статья» (B1); ✔ флаг `mgmt_articles` (A1); ✔ frontend-дерево (C1–C5). Направления на `branch_id` — каркас готов (`branch_id` уже есть в проводках; DTO свёртки наследует `FinancialSheetBranchesQueryDto` → фильтр по ветке работает), визуальный лейбл «Направление» вынесен в Out of scope (зависит от ③).

**2. Placeholder-скан.** Кода-заглушек нет; каждый шаг содержит полный код. Остаются два места сверки с реальным кодом фронта (имена экспортов `components/ui` — `Dialog`/`Select`/`Form…`; и доступность нужных иконок `lucide-react`) — это сверка фактических экспортов нового стека перед вставкой, а не TODO. Серверные сверки (`ServiceError.errorType`, путь `FinancialSheetBranchesQueryDto`, шаблоны миграций/сидов) уже подтверждены по исходникам.

**3. Согласованность типов/имён.** Модели `ManagementArticle`/`ManagementArticleAccount`; метод свёртки `getRollup` совпадает в сервисе (B1) и в `ManagementArticlesApplication.getArticlesPlRollup`; флаг-строка `'mgmt_articles'` едина в server-enum (`Features.MGMT_ARTICLES`), frontend `featureCan('mgmt_articles')` и описании. DTO `accountIds?: number[]` используется одинаково в Create/Edit и в командах синка карты. Валидатор бросает `ServiceError(ERRORS.*)`, тесты сверяют `errorType` — поле подтверждено по исходнику.

**4. Гейт-замечание исполнителю.** Старт — после Ф1 роадмапа; миграционные timestamp'ы перегенерировать скиллом `make-migration` на момент исполнения (в плане — образцы `20260529…`).

---

## Журнал исполнения (2026-05-29) — Part A + Part B (бэкенд-ядро)

Бэкенд (Этап 0, задачи A1–B2) реализован на ветке `feat/management-articles-foundation`, 13 коммитов (TDD, по одному логическому изменению на коммит). Frontend (C1–C5) отложен по решению основателя — отдельный заход.

**Коммиты (BASE `6abf77fd2`):**
- `e2a43b590` A1 флаг `mgmt_articles`
- `bbbbb8695` A2 миграция `management_articles`
- `506286627` A3 миграция `management_article_accounts`
- `2d91743e1` A4 `buildArticleTree`
- `7ccd7b90b` A5 модели + регистрация в Tenancy
- `3977f7c0e` A6 DTO/интерфейсы/константы
- `437da564f` A7 валидатор
- `2808c07c4` A8 команда создания
- `2a383d2ee` A9 команды правки/удаления
- `7925256e0` A10 запросы (список/дерево/одна)
- `5f4f47b76` A11 проводка модуля (application/controller/module + App.module)
- `575fff6db` B1 свёртка «счёт→статья» + тест инварианта
- `07bac835e` B2 сид дефолтного RU-дерева

**Верификация (локально):**
- ✅ Jest: 10/10 тестов модуля зелёные (флаг; дерево; валидатор; create; delete; список/дерево; свёртка + инвариант «статьи == счета»).
- ✅ `tsc --noEmit` всего пакета server: **0 ошибок** (включая файлы проводки/сид, которые не покрыты юнит-тестами).
- ✅ commitlint-хук прошёл на всех 13 коммитах (без `--no-verify`).

**Отложено (нет локальной БД):** прогон миграций `latest→rollback→latest` и проверка сида на реальной БД — выполнить в CI или когда поднимут БД (риск низкий: миграции additive, сид — простые INSERT).

**Поправки к плану, внесённые при исполнении (код-источник истины — коммиты выше):**
1. **A7-тест:** конструктор валидатора принимает ТРИ прокси-модели (`articleModel`, `accountModel`, `articleAccountModel`) — тест в этом документе инстанцировал с двумя аргументами, что давало `TS2554`. В коде тест передаёт три стаба.
2. **A10-тест:** заглушка выровнена под фактическую цепочку `query().onBuild(cb)` (chainable-builder, чей `onBuild` вызывает колбэк и резолвится в строки), вместо `query().orderBy()` напрямую.

### Финальное код-ревью (opus) — итог

Критических проблем нет; реализация признана годной к сохранению/мерджу после отложенной проверки на БД. Бренд-нарушений и over-building не найдено.

**Исправлено сразу:**
- **#1 (Important) — циклы родителя.** Статью можно было сделать собственным родителем или замкнуть цикл (A→B→A), после чего `buildArticleTree` молча терял эти узлы. Добавлен guard `validateNoParentCycle` (само-родитель + обход цепочки предков), вызывается в `edit`. Коммит `485bde0d7`, +3 теста (валидатор 5/5).

**Follow-up (зафиксировано, решать отдельно; флаг выключен — не срочно):**
> ✅ **#2 / #3 / #4 закрыты 2026-05-30** — см. журнал «follow-up бэклог код-ревью» ниже.
- **#2 (Important) — смена `kind`/`cashflowSection` при правке** статьи с детьми/привязанными счетами может дать несогласованную свёртку (ребёнок «расход» под родителем «доход»). Политика на выбор основателя: запретить смену `kind` при наличии детей/счетов ИЛИ валидировать совпадение с родителем.
- **#3 (Minor) — `tree=true` + фильтр `kind`:** ребёнок, прошедший фильтр, чей родитель отфильтрован, всплывает как корень. Для текущего сида (поддеревья одного типа) не проявляется. Фикс: при `tree=true` игнорировать `kind` либо фильтровать листья после сборки дерева.
- **#4 (Minor) — фильтр дат свёртки «всё или ничего»** (`if (fromDate && toDate)`); модификатор `filterDateRange` уже обрабатывает каждую границу независимо. Привести к общему паттерну (вызывать при наличии любой границы).

## Журнал исполнения (2026-05-29) — Part C (фронтенд)

Frontend (C1–C5) реализован на той же ветке, 6 коммитов.

**Коммиты:**
- `a590ab435` C1 i18n-ключи (en/ru, 22 ключа, парность ✅)
- `5ca967508` C2 React Query хуки (+ ключи в `types.tsx`)
- `0cdd326ef` C3 Zod-схема формы
- `2102bbc14` C4 компоненты (дерево + inline-форма + страница)
- `c77e34d8b` C5 маршрут `/management-articles`
- `d91e6008c` C4-fix сигнатуры вызова легаси JS-хуков под tsc

**Адаптации против плана (в `components/ui` НЕТ `dialog`/`select`):**
- Форма — не модалка, а инлайновая **Card**-панель; поле «тип» — нативный `<select>` внутри `FormControl` (Slot пробрасывает props). Использованы только реально существующие примитивы (`card`, `form`, `input`, `button`, `sonner`, иконки `lucide-react`).
- Drag-and-drop переупорядочивание дерева в v1 не делалось (см. Out of scope).
- Гейт по фиче — на уровне страницы: `if (!featureCan('mgmt_articles')) return null;` (без правки бокового меню; для v1 достаточно).

**Верификация (локально):**
- ✅ `lang-check`: 2488=2488, 0 расхождений en↔ru.
- ✅ `tsc --noEmit` пакета webapp: **0 ошибок**.
- ✅ commitlint прошёл на всех коммитах.
- ⏳ Живой UI локально не проверить (бэкенд не поднят) — только типы + парность; ручная проверка на `ru` и e2e — при поднятом окружении.

## Журнал исполнения (2026-05-30) — follow-up бэклог код-ревью (#2/#3/#4)

Закрыты три follow-up'а из финального код-ревью (см. раздел «Follow-up» выше), TDD, 4 коммита на ветке `feat/management-articles-foundation`.

**Коммиты:**
- `9c0b5bb42` **#4** свёртка: фильтр дат применяется при наличии **любой** границы (`fromDate || toDate`), а не только обеих. Модификатор `filterDateRange` уже гейтит каждую границу независимо (подтверждено по `AccountTransaction.model`). +3 теста `getRollup` (only-from / only-to / neither).
- `75e1ff407` **#3** список: `tree=true` + фильтр `kind` больше не «всплывает» ребёнка отфильтрованного родителя как корень — дерево строится из полного леса, затем корни фильтруются по `kind`; плоский режим фильтрует в запросе как раньше. +2 теста.
- `86c14e000` **#2 (backend)** инвариант: `kind` подстатьи обязан совпадать с `kind` родителя (корни свободны). `validateKindMatchesParent` (create+edit) + `validateChildrenMatchKind` (edit, блокирует смену kind при наличии детей старого вида) + коды `ARTICLE_KIND_PARENT_MISMATCH` / `ARTICLE_KIND_CHILDREN_MISMATCH`. +5 тестов валидатора.
- `42077ac6f` **#2 (frontend)**: парент-пикер в форме фильтруется по `kind`; смена `kind` сбрасывает несовместимого выбранного родителя (чтобы не отправлять заведомо отклоняемый сервером payload).

**Решение #2 — выбор основателя:** «**тип = тип родителя**» (вариант A). Однородные по `kind` поддеревья → свёртка никогда не смешивает доход с расходом; заодно делает #3 структурно невозможным.

**Верификация (локально, Node 18.16.1):**
- ✅ Jest: полный модуль `ManagementArticles` зелёный — **6 спек / 32 теста** (было 22, +10).
- ✅ `tsc --noEmit` server + webapp: **0 ошибок**.
- ✅ `lang-check`: 2489=2489, 0 расхождений (строки не добавлялись).
- ✅ commitlint прошёл на всех 4 коммитах (без `--no-verify`).
- ⏳ Прогон миграций на реальной БД — по-прежнему отложен (нет локальной БД); follow-up'ы схему БД не трогали.

**Остаётся открытым (минор, не блокирует):** конкретные коды ошибок #2 на фронте пока показываются общим тостом `management_articles.save_error` (маппинг код→сообщение — отдельная задача, если понадобится более точная обратная связь в форме).

## Журнал исполнения (2026-05-30) — повторная финальная верификация

Перед закрытием этапа прогнал «Финальную проверку этапа» заново на чистом дереве (Node 18.16.1, pnpm 10.33.0), чтобы подтвердить свежими доказательствами, а не доверять прошлым записям журнала.

**Результаты (5/6 ✅, 1 отложен):**
- ✅ **Backend:** `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles` → **6 спек / 32 теста** зелёные.
- ✅ **Типы:** `pnpm typecheck` → 3 проекта (`server`/`webapp`/`sdk-ts`), **0 ошибок** (предупреждения «Unsupported engine» — Nx-сабпроцессы на системном Node 24, на `tsc --noEmit` не влияют).
- ✅ **i18n:** `node packages/webapp/scripts/lang-check.js` → **2489 = 2489**, 0 расхождений.
- ✅ **Инвариант свёртки:** `ArticlesPlRollup.service.spec.ts` зелёный (входит в 32 теста).
- ✅ **Флаг:** `FeaturesConfigure.spec.ts` → «registers the management articles feature, default off» зелёный (этот тест вне `src/modules/ManagementArticles`, прогнан отдельно).
- ⏳ **Миграции `latest → rollback → latest`** — по-прежнему отложено: локальной БД нет. Прогнать в CI / при поднятом окружении. Риск низкий (additive, рабочие `down()`).

Имплементация этапа (A1–C5 + код-ревью #1 + follow-up #2/#3/#4) полностью закоммичена ранее; новых правок кода в этой верификации не делалось — только прогон проверок и отметки в чек-листе.
