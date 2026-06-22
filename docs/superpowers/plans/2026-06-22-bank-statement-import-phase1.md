# ⑨ Банковские выписки — Фаза 1, план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Загрузить файл банковской выписки 1С (.txt), разобрать его, отбросить дубли и сложить операции в «Разбор», где пользователь привязывает контрагента (по ИНН, с авто-созданием) и статью, после чего подтверждает → проводка.

**Architecture:** Подход A — переиспользуем существующий cashflow-конвейер (`CreateUncategorizedTransactionService` → «Разбор» → `CategorizeBankTransaction` → проводка). Добавляем российское: чистый парсер 1С (cp1251), определение направления по заголовку файла, дедуп, поиск контрагента по ИНН, проброс `contactId` в категоризацию. Всё за флагом `bank_statement_import` (off).

**Tech Stack:** NestJS 10 + Knex/Objection (server), Jest. Декодирование cp1251 — встроенный Node `TextDecoder('windows-1251')` (full-ICU в Node 18), без новых зависимостей. React 18 + RTK + react-intl-universal (webapp), vitest.

**Спека:** `docs/superpowers/specs/2026-06-22-bank-statement-import-design.md`
**Ветка:** `feat/bank-statement-import`

---

## Структура файлов (что создаём/меняем)

**Сервер (новое):**
- `packages/server/src/modules/BankStatementImport/utils/decodeStatement.ts` — декодер буфера (cp1251/UTF-8).
- `packages/server/src/modules/BankStatementImport/utils/parse1CStatement.ts` — чистый парсер формата 1С.
- `packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts` — юнит-тесты парсера+декодера+дедупа+направления.
- `packages/server/src/modules/BankStatementImport/utils/statementHelpers.ts` — `buildExternalId`, `resolveDirection`.
- `packages/server/src/modules/BankStatementImport/commands/Import1CStatement.service.ts` — оркестрация импорта.
- `packages/server/src/modules/BankStatementImport/Import1CStatement.service.spec.ts` — интеграционный тест сервиса.
- `packages/server/src/modules/BankStatementImport/BankStatementImport.controller.ts` — эндпоинт загрузки.
- `packages/server/src/modules/BankStatementImport/BankStatementImport.module.ts` — модуль.
- `packages/server/src/modules/BankStatementImport/dtos/Import1CResult.dto.ts` — тип ответа `{ imported, skipped }`.
- `packages/server/src/modules/Contacts/queries/GetContactByInn.service.ts` — finder по ИНН + spec.

**Сервер (правки):**
- `packages/server/src/common/types/Features.ts` — добавить флаг.
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — зарегистрировать флаг (default false).
- `packages/server/src/modules/BankingCategorize/dtos/CreateUncategorizedBankTransaction.dto.ts` — `payeeInn?`, `externalId?`.
- `packages/server/src/modules/BankingTransactions/models/UncategorizedBankTransaction.ts` — поля `payeeInn`, `externalId`.
- `packages/server/src/modules/BankingCategorize/dtos/CategorizeBankTransaction.dto.ts` — `contactId?`.
- `packages/server/src/modules/BankingTransactions/models/BankTransaction.ts` — поле `contactId`.
- цепочка категоризации (`CategorizeBankTransaction.ts` → `CreateBankTransaction.service.ts`) — проброс `contactId`.
- `packages/server/src/app.module.ts` (или агрегатор модулей) — подключить `BankStatementImportModule`.
- tenant-миграция (новая) — колонки `payee_inn`, `external_id`, `contact_id`.

**Вебапп (правки):** флаг + lang-ключи + кнопка/диалог импорта 1С + показ ИНН/контрагента в разборе. (Задачи 11–14.)

---

## Task 1: Проверить декодер cp1251 (спайк) и флаг функции

**Files:**
- Modify: `packages/server/src/common/types/Features.ts:24`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`

- [ ] **Step 1: Спайк декодера.** В корне репо выполнить:

Run: `node -e "const d=new TextDecoder('windows-1251'); console.log(d.decode(Buffer.from([0xCE,0xCE,0xCE])))"`
Expected: печатает `ООО` (три кириллические «О»). Если падает «encoding not supported» — переключиться на запасную таблицу cp1251 (см. Task 4, заметка). При успехе — используем `TextDecoder`.

- [ ] **Step 2: Добавить флаг в enum.** В `Features.ts` после строки `FINANCIAL_MODEL = 'financial_model',` добавить:

```ts
  BANK_STATEMENT_IMPORT = 'bank_statement_import',
```

- [ ] **Step 3: Зарегистрировать флаг.** В `FeaturesConfigure.ts` найти массив конфигураций фич (где перечислены `Features.FINANCIAL_MODEL` и пр.) и добавить по образцу соседней записи:

```ts
  { name: Features.BANK_STATEMENT_IMPORT, defaultValue: false },
```

- [ ] **Step 4: Проверка типов.**

Run: `pnpm --filter @bigfin/server run typecheck` (или `tsc --noEmit` в пакете server)
Expected: без ошибок.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts
git commit -m "feat(bank-import): флаг bank_statement_import"
```

---

## Task 2: Tenant-миграция (payee_inn, external_id, contact_id)

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260622120000_bank_statement_import_columns.js`

- [ ] **Step 1: Написать миграцию** (образец стиля — последняя миграция финмодели `20260621130000_add_cost_behavior_to_management_articles.js`):

```js
exports.up = function (knex) {
  return knex.schema
    .alterTable('uncategorized_cashflow_transactions', (table) => {
      table.string('payee_inn', 12).nullable();
      table.string('external_id').nullable().index();
    })
    .alterTable('cashflow_transactions', (table) => {
      table
        .integer('contact_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('contacts');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('cashflow_transactions', (table) => {
      table.dropColumn('contact_id');
    })
    .alterTable('uncategorized_cashflow_transactions', (table) => {
      table.dropColumn('payee_inn');
      table.dropColumn('external_id');
    });
};
```

- [ ] **Step 2: Проверить применимость (по возможности).** Если локальный tenant-CLI работает: `pnpm tenants:migrate:latest` → `pnpm tenants:migrate:rollback` → `pnpm tenants:migrate:latest`. Если CLI локально не накатывает (известная проблема — см. память `project_tenant_migration_cli_broken_local`) — миграция применяется при провижне тенанта; убедиться, что `up`/`down` синтаксически валидны.

Run: `node --check packages/server/src/database/tenant/migrations/20260622120000_bank_statement_import_columns.js`
Expected: без вывода (синтаксис ок).

- [ ] **Step 3: Commit.**

```bash
git add packages/server/src/database/tenant/migrations/20260622120000_bank_statement_import_columns.js
git commit -m "feat(bank-import): миграция payee_inn/external_id/contact_id"
```

---

## Task 3: Декодер выписки (cp1251/UTF-8)

**Files:**
- Create: `packages/server/src/modules/BankStatementImport/utils/decodeStatement.ts`
- Test: `packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`

- [ ] **Step 1: Написать падающий тест.** Создать spec-файл с первым тестом:

```ts
import { decodeStatementBuffer } from './decodeStatement';

describe('decodeStatementBuffer', () => {
  it('декодирует windows-1251 в кириллицу', () => {
    // 0xCE 0xCE 0xCE = "ООО" в cp1251
    const buf = Buffer.from([0xce, 0xce, 0xce]);
    expect(decodeStatementBuffer(buf)).toBe('ООО');
  });

  it('декодирует UTF-8 с BOM', () => {
    const buf = Buffer.from('﻿Привет', 'utf8');
    expect(decodeStatementBuffer(buf)).toBe('Привет');
  });
});
```

- [ ] **Step 2: Запустить — упадёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`
Expected: FAIL — модуль `./decodeStatement` не найден.

- [ ] **Step 3: Реализовать декодер.**

```ts
/**
 * Декодирует буфер файла выписки. Файлы 1С обычно в windows-1251,
 * реже UTF-8 (с BOM). Используем встроенный TextDecoder (full-ICU в Node 18).
 */
export function decodeStatementBuffer(buf: Buffer): string {
  // UTF-8 BOM?
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  // UTF-16LE BOM?
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf.slice(2));
  }
  return new TextDecoder('windows-1251').decode(buf);
}
```

- [ ] **Step 4: Запустить — пройдёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/BankStatementImport/utils/decodeStatement.ts packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts
git commit -m "feat(bank-import): декодер выписки cp1251/utf-8"
```

---

## Task 4: Парсер формата 1С (чистая функция)

**Files:**
- Create: `packages/server/src/modules/BankStatementImport/utils/parse1CStatement.ts`
- Test: `packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts` (дополнить)

> Заметка по запасному декодеру: если на Step 1 Task 1 `TextDecoder('windows-1251')` не поддержан, добавить в `decodeStatement.ts` таблицу cp1251→Unicode (массив 128 кодпойнтов для байтов 0x80–0xFF, стандарт windows-1251) и маппить байты вручную. Тесты Task 3 не меняются.

- [ ] **Step 1: Дописать падающие тесты парсера** в тот же spec. Фикстура отражает стандарт `1CClientBankExchange`:

```ts
import { parse1CStatement } from './parse1CStatement';

const FIXTURE = [
  '1CClientBankExchange',
  'ВерсияФормата=1.03',
  'Кодировка=Windows',
  'РасчСчет=40702810400000012345',
  'СекцияДокумент=Платежное поручение',
  'Номер=101',
  'Дата=15.06.2026',
  'Сумма=15000.50',
  'ПлательщикСчет=40702810400000099999',
  'Плательщик=ООО "Клиент"',
  'ПлательщикИНН=7701234567',
  'ПлательщикРасчСчет=40702810400000099999',
  'ПолучательСчет=40702810400000012345',
  'Получатель=ООО "Наша Компания"',
  'ПолучательИНН=7707654321',
  'ПолучательРасчСчет=40702810400000012345',
  'НазначениеПлатежа=Оплата по счету 5 от 01.06.2026',
  'КонецДокумента',
  'СекцияДокумент=Платежное поручение',
  'Номер=102',
  'Дата=16.06.2026',
  'Сумма=3000.00',
  'ПлательщикРасчСчет=40702810400000012345',
  'Плательщик=ООО "Наша Компания"',
  'ПлательщикИНН=7707654321',
  'ПолучательРасчСчет=40817810400000055555',
  'Получатель=ООО "Поставщик"',
  'ПолучательИНН=7709999999',
  'НазначениеПлатежа=Оплата за материалы',
  'КонецДокумента',
  'КонецФайла',
].join('\r\n');

describe('parse1CStatement', () => {
  it('читает счёт из заголовка и оба документа', () => {
    const res = parse1CStatement(FIXTURE);
    expect(res.headerAccount).toBe('40702810400000012345');
    expect(res.documents).toHaveLength(2);
  });

  it('разбирает поля документа', () => {
    const [doc] = parse1CStatement(FIXTURE).documents;
    expect(doc.docNumber).toBe('101');
    expect(doc.date).toBe('2026-06-15');
    expect(doc.amount).toBe(15000.5);
    expect(doc.payerInn).toBe('7701234567');
    expect(doc.payeeInn).toBe('7707654321');
    expect(doc.payerAccountNumber).toBe('40702810400000099999');
    expect(doc.payeeAccountNumber).toBe('40702810400000012345');
    expect(doc.purpose).toBe('Оплата по счету 5 от 01.06.2026');
  });

  it('не падает на файле без документов', () => {
    expect(parse1CStatement('1CClientBankExchange\r\nКонецФайла').documents).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — упадёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`
Expected: FAIL — `parse1CStatement` не найден.

- [ ] **Step 3: Реализовать парсер.**

```ts
export interface Parsed1CDocument {
  docNumber: string;
  date: string; // ISO 'YYYY-MM-DD'
  amount: number;
  payerAccountNumber: string;
  payeeAccountNumber: string;
  payerName: string;
  payerInn: string;
  payeeName: string;
  payeeInn: string;
  purpose: string;
}

export interface Parsed1CStatement {
  headerAccount: string;
  documents: Parsed1CDocument[];
}

/** 'ДД.ММ.ГГГГ' → 'ГГГГ-ММ-ДД' */
function toIsoDate(ddmmyyyy: string): string {
  const m = (ddmmyyyy || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function parseAmount(raw: string): number {
  const n = parseFloat((raw || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Разбивает 'Ключ=Значение' (значение может содержать '='). */
function splitKv(line: string): [string, string] | null {
  const i = line.indexOf('=');
  if (i < 0) return null;
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}

export function parse1CStatement(text: string): Parsed1CStatement {
  const lines = text.split(/\r\n|\n|\r/);
  let headerAccount = '';
  const documents: Parsed1CDocument[] = [];
  let cur: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.startsWith('СекцияДокумент')) {
      cur = {};
      continue;
    }
    if (line.startsWith('КонецДокумента')) {
      if (cur) documents.push(mapDocument(cur));
      cur = null;
      continue;
    }
    const kv = splitKv(line);
    if (!kv) continue;
    const [key, value] = kv;
    if (cur) {
      cur[key] = value;
    } else if (key === 'РасчСчет' && !headerAccount) {
      headerAccount = value;
    }
  }
  return { headerAccount, documents };
}

function mapDocument(d: Record<string, string>): Parsed1CDocument {
  return {
    docNumber: d['Номер'] || '',
    date: toIsoDate(d['Дата'] || d['ДатаСписано'] || d['ДатаПоступило'] || ''),
    amount: parseAmount(d['Сумма'] || ''),
    payerAccountNumber: d['ПлательщикРасчСчет'] || d['ПлательщикСчет'] || '',
    payeeAccountNumber: d['ПолучательРасчСчет'] || d['ПолучательСчет'] || '',
    payerName: d['Плательщик1'] || d['Плательщик'] || '',
    payerInn: d['ПлательщикИНН'] || '',
    payeeName: d['Получатель1'] || d['Получатель'] || '',
    payeeInn: d['ПолучательИНН'] || '',
    purpose: d['НазначениеПлатежа'] || '',
  };
}
```

- [ ] **Step 4: Запустить — пройдёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`
Expected: PASS (все тесты файла).

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/BankStatementImport/utils/parse1CStatement.ts packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts
git commit -m "feat(bank-import): парсер формата 1С (1CClientBankExchange)"
```

---

## Task 5: Направление и ключ дедупликации (чистые функции)

**Files:**
- Create: `packages/server/src/modules/BankStatementImport/utils/statementHelpers.ts`
- Test: `packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts` (дополнить)

- [ ] **Step 1: Дописать падающие тесты.**

```ts
import { resolveDirection, buildExternalId } from './statementHelpers';

describe('resolveDirection', () => {
  const docIn = parse1CStatement(FIXTURE).documents[0]; // получатель = наш счёт
  const docOut = parse1CStatement(FIXTURE).documents[1]; // плательщик = наш счёт
  const acc = '40702810400000012345';

  it('приход, если наш счёт — получатель', () => {
    const r = resolveDirection(docIn, acc);
    expect(r.direction).toBe('in');
    expect(r.counterpartyInn).toBe('7701234567'); // плательщик
    expect(r.counterpartyName).toBe('ООО "Клиент"');
  });

  it('расход, если наш счёт — плательщик', () => {
    const r = resolveDirection(docOut, acc);
    expect(r.direction).toBe('out');
    expect(r.counterpartyInn).toBe('7709999999'); // получатель
  });

  it('unknown, если счёт не совпал', () => {
    expect(resolveDirection(docIn, '00000000000000000000').direction).toBe('unknown');
  });
});

describe('buildExternalId', () => {
  it('устойчив к повторному вызову', () => {
    const doc = parse1CStatement(FIXTURE).documents[0];
    expect(buildExternalId(doc)).toBe(buildExternalId(doc));
  });
  it('различает разные документы', () => {
    const [a, b] = parse1CStatement(FIXTURE).documents;
    expect(buildExternalId(a)).not.toBe(buildExternalId(b));
  });
});
```

- [ ] **Step 2: Запустить — упадёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`
Expected: FAIL — `./statementHelpers` не найден.

- [ ] **Step 3: Реализовать.**

```ts
import { Parsed1CDocument } from './parse1CStatement';

export type StatementDirection = 'in' | 'out' | 'unknown';

export interface ResolvedLine {
  direction: StatementDirection;
  counterpartyName: string;
  counterpartyInn: string;
}

/**
 * Направление относительно нашего счёта (из заголовка файла):
 * наш счёт получатель → приход, контрагент = плательщик;
 * наш счёт плательщик → расход, контрагент = получатель.
 */
export function resolveDirection(
  doc: Parsed1CDocument,
  ourAccountNumber: string,
): ResolvedLine {
  if (doc.payeeAccountNumber && doc.payeeAccountNumber === ourAccountNumber) {
    return { direction: 'in', counterpartyName: doc.payerName, counterpartyInn: doc.payerInn };
  }
  if (doc.payerAccountNumber && doc.payerAccountNumber === ourAccountNumber) {
    return { direction: 'out', counterpartyName: doc.payeeName, counterpartyInn: doc.payeeInn };
  }
  return { direction: 'unknown', counterpartyName: '', counterpartyInn: '' };
}

/** Устойчивый ключ дедупликации в рамках одного счёта. */
export function buildExternalId(doc: Parsed1CDocument): string {
  return `1c:${doc.docNumber}:${doc.date}:${doc.amount.toFixed(2)}`;
}
```

- [ ] **Step 4: Запустить — пройдёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/utils/parse1CStatement.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/BankStatementImport/utils/statementHelpers.ts packages/server/src/modules/BankStatementImport/utils/parse1CStatement.spec.ts
git commit -m "feat(bank-import): направление операции и ключ дедупликации"
```

---

## Task 6: Расширить DTO и модели (payeeInn, externalId, contactId)

**Files:**
- Modify: `packages/server/src/modules/BankingCategorize/dtos/CreateUncategorizedBankTransaction.dto.ts`
- Modify: `packages/server/src/modules/BankingTransactions/models/UncategorizedBankTransaction.ts`
- Modify: `packages/server/src/modules/BankingCategorize/dtos/CategorizeBankTransaction.dto.ts` (после поля `branchId`, строка ~99)
- Modify: `packages/server/src/modules/BankingTransactions/models/BankTransaction.ts`

- [ ] **Step 1: Расширить `UncategorizedBankTransactionDto`.** Добавить перед `batch?`:

```ts
  @IsString()
  @IsOptional()
  payeeInn?: string | null;

  @IsString()
  @IsOptional()
  externalId?: string | null;
```

(Добавить `IsOptional` в импорт из `class-validator`, если отсутствует.)

- [ ] **Step 2: Объявить поля в модели `UncategorizedBankTransaction`.** Найти блок объявления свойств (`payee: string;` и т.п.) и добавить:

```ts
  payeeInn?: string;
  externalId?: string;
```

(Глобальный `knexSnakeCaseMappers` сам сопоставит `payeeInn`↔`payee_inn`, `externalId`↔`external_id`.)

- [ ] **Step 3: Расширить `CategorizeBankTransactionDto`.** После поля `branchId` добавить:

```ts
  @ApiPropertyOptional({
    description: 'ID of the linked contact (counterparty)',
    type: Number,
    example: 55,
  })
  @IsNumber()
  @IsOptional()
  contactId?: number;
```

- [ ] **Step 4: Объявить `contactId` в модели `BankTransaction`.** После `branchId: number;` добавить:

```ts
  contactId?: number;
```

- [ ] **Step 5: Проверка типов.**

Run: `pnpm --filter @bigfin/server run typecheck`
Expected: без ошибок.

- [ ] **Step 6: Commit.**

```bash
git add packages/server/src/modules/BankingCategorize/dtos packages/server/src/modules/BankingTransactions/models
git commit -m "feat(bank-import): поля payeeInn/externalId/contactId в dto и моделях"
```

---

## Task 7: Проброс contactId в проводку

**Files:**
- Modify: `packages/server/src/modules/BankingCategorize/commands/CategorizeBankTransaction.ts`
- Modify: `packages/server/src/modules/BankingTransactions/commands/CreateBankTransaction.service.ts`
- Test: `packages/server/src/modules/BankingCategorize/commands/CategorizeBankTransaction.contact.spec.ts`

> Перед реализацией прочитать `CategorizeBankTransaction.ts` и `CreateBankTransaction.service.ts`: найти, где формируется объект новой `BankTransaction` (`newCashflowTransaction`/`createDTO`), и убедиться, что `contactId` из DTO долетает до вставки. Также определить соглашение знака суммы для прихода/расхода (deposit/withdrawal) — понадобится в Task 9.

- [ ] **Step 1: Написать падающий тест.** Тест проверяет, что при категоризации с `contactId` создаётся проводка с этим `contactId`. Использовать существующий тестовый бутстрап модуля Banking (взять за образец соседний spec в `BankingCategorize`: структура `beforeAll`, фабрика приложения, сидинг tenant). Скелет сценария:

```ts
// 1) создать uncategorized транзакцию (CreateUncategorizedTransactionService.create)
// 2) categorize(id, { date, creditAccountId, transactionType, contactId })
// 3) прочитать созданную BankTransaction → expect(tx.contactId).toBe(contactId)
```

- [ ] **Step 2: Запустить — упадёт** (contactId не сохраняется).

Run: `pnpm --filter @bigfin/server test -- src/modules/BankingCategorize/commands/CategorizeBankTransaction.contact.spec.ts`
Expected: FAIL — `contactId` undefined на созданной проводке.

- [ ] **Step 3: Реализовать проброс.** В `CategorizeBankTransaction.ts` передать `contactId` из `categorizeDTO` в вызов создания проводки. В `CreateBankTransaction.service.ts` включить `contactId` в объект, идущий во вставку (`insert`/`insertGraph`). Точные имена полей — по факту чтения файлов (шаг-заметка).

- [ ] **Step 4: Запустить — пройдёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankingCategorize/commands/CategorizeBankTransaction.contact.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/BankingCategorize/commands/CategorizeBankTransaction.ts packages/server/src/modules/BankingTransactions/commands/CreateBankTransaction.service.ts packages/server/src/modules/BankingCategorize/commands/CategorizeBankTransaction.contact.spec.ts
git commit -m "feat(bank-import): привязка контрагента при категоризации"
```

---

## Task 8: Поиск контрагента по ИНН

**Files:**
- Create: `packages/server/src/modules/Contacts/queries/GetContactByInn.service.ts`
- Test: `packages/server/src/modules/Contacts/queries/GetContactByInn.service.spec.ts`
- Modify: `packages/server/src/modules/Contacts/Contacts.module.ts` (провайдер/экспорт)

> Прочитать соседний query-сервис в `Contacts/queries/` для точного DI-паттерна (инъекция `TenantModelProxy<typeof Contact>` через `@Inject(Contact.name)`).

- [ ] **Step 1: Написать падающий тест.** Сценарий: засидить два контакта (один с `inn='7701234567'`), `getByInn('7701234567')` → возвращает его; `getByInn('0000')` → `undefined`.

- [ ] **Step 2: Запустить — упадёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/Contacts/queries/GetContactByInn.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать.**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '../models/Contact';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

@Injectable()
export class GetContactByInnService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  /** Возвращает первого контрагента с данным ИНН или undefined. */
  public async getByInn(inn: string): Promise<Contact | undefined> {
    if (!inn) return undefined;
    return this.contactModel().query().findOne({ inn });
  }
}
```

(Зарегистрировать сервис в провайдерах модуля Contacts и экспортировать для использования в BankStatementImport.)

- [ ] **Step 4: Запустить — пройдёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/Contacts/queries/GetContactByInn.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/Contacts/queries/GetContactByInn.service.ts packages/server/src/modules/Contacts/queries/GetContactByInn.service.spec.ts packages/server/src/modules/Contacts/Contacts.module.ts
git commit -m "feat(bank-import): поиск контрагента по ИНН"
```

---

## Task 9: Сервис импорта 1С (оркестрация)

**Files:**
- Create: `packages/server/src/modules/BankStatementImport/dtos/Import1CResult.dto.ts`
- Create: `packages/server/src/modules/BankStatementImport/commands/Import1CStatement.service.ts`
- Test: `packages/server/src/modules/BankStatementImport/Import1CStatement.service.spec.ts`

> Знак суммы (приход/расход) проставить согласно соглашению, выясненному в Task 7 (deposit=положительная, withdrawal=отрицательная — подтвердить чтением `CategorizeBankTransaction`/recognize). Ниже допущение: приход → `+amount`, расход → `-amount`.

- [ ] **Step 1: Тип результата.**

```ts
export interface Import1CResult {
  imported: number;
  skipped: number;
}
```

- [ ] **Step 2: Написать падающий интеграционный тест.** Сценарий:
  1. Создать денежный счёт (или взять засиженный) с расчётным счётом `40702810400000012345`.
  2. Импортировать `FIXTURE` (из Task 4) на этот счёт.
  3. Ожидать `{ imported: 2, skipped: 0 }`; в `uncategorized_cashflow_transactions` 2 строки с `external_id`, `payee_inn`, корректными знаками сумм (+15000.5 приход, −3000 расход), `description` = назначение.
  4. Повторный импорт того же файла → `{ imported: 0, skipped: 2 }` (дедуп).

```ts
// Бутстрап — как в других server spec (фабрика приложения + tenant сидинг).
// ourAccountNumber передаётся в сервис параметром.
```

- [ ] **Step 3: Запустить — упадёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/Import1CStatement.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 4: Реализовать сервис.**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { decodeStatementBuffer } from '../utils/decodeStatement';
import { parse1CStatement } from '../utils/parse1CStatement';
import { resolveDirection, buildExternalId } from '../utils/statementHelpers';
import { Import1CResult } from '../dtos/Import1CResult.dto';

@Injectable()
export class Import1CStatementService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly createUncategorized: CreateUncategorizedTransactionService,
    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,
  ) {}

  /**
   * Импортирует выписку 1С на указанный денежный счёт.
   * @param accountId — счёт Bigfin для зачисления операций.
   * @param ourAccountNumber — расчётный счёт (если пуст — берём из заголовка файла).
   * @param currencyCode — валюта счёта.
   * @param buffer — содержимое .txt файла.
   */
  public async import(
    accountId: number,
    ourAccountNumber: string,
    currencyCode: string,
    buffer: Buffer,
  ): Promise<Import1CResult> {
    const text = decodeStatementBuffer(buffer);
    const parsed = parse1CStatement(text);
    const ourAccount = ourAccountNumber || parsed.headerAccount;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      let imported = 0;
      let skipped = 0;

      for (const doc of parsed.documents) {
        const resolved = resolveDirection(doc, ourAccount);
        if (resolved.direction === 'unknown') {
          skipped++;
          continue;
        }
        const externalId = buildExternalId(doc);
        const exists = await this.uncategorizedModel()
          .query(trx)
          .findOne({ accountId, externalId });
        if (exists) {
          skipped++;
          continue;
        }
        const signedAmount = resolved.direction === 'in' ? doc.amount : -doc.amount;
        await this.createUncategorized.create(
          {
            date: doc.date,
            accountId,
            amount: signedAmount,
            currencyCode,
            payee: resolved.counterpartyName,
            payeeInn: resolved.counterpartyInn,
            description: doc.purpose,
            referenceNo: doc.docNumber,
            externalId,
          },
          trx,
        );
        imported++;
      }
      return { imported, skipped };
    });
  }
}
```

- [ ] **Step 5: Запустить — пройдёт.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport/Import1CStatement.service.spec.ts`
Expected: PASS (оба сценария, включая дедуп).

- [ ] **Step 6: Commit.**

```bash
git add packages/server/src/modules/BankStatementImport/commands packages/server/src/modules/BankStatementImport/dtos packages/server/src/modules/BankStatementImport/Import1CStatement.service.spec.ts
git commit -m "feat(bank-import): сервис импорта выписки 1С с дедупликацией"
```

---

## Task 10: Контроллер, модуль и подключение

**Files:**
- Create: `packages/server/src/modules/BankStatementImport/BankStatementImport.controller.ts`
- Create: `packages/server/src/modules/BankStatementImport/BankStatementImport.module.ts`
- Modify: агрегатор модулей приложения (где импортируются `FinancialModelModule` и пр., напр. `app.module.ts`)

> Прочитать недавний модуль (напр. `FinancialModel.module.ts`) и контроллер для точных импортов, гейта флага и `@RequirePermission`. Загрузку файла делать через `FileInterceptor` (multer уже в проекте), как в модуле `Import`.

- [ ] **Step 1: Модуль.**

```ts
import { Module } from '@nestjs/common';
import { BankStatementImportController } from './BankStatementImport.controller';
import { Import1CStatementService } from './commands/Import1CStatement.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';

@Module({
  imports: [BankingCategorizeModule],
  controllers: [BankStatementImportController],
  providers: [Import1CStatementService],
})
export class BankStatementImportModule {}
```

(Если `CreateUncategorizedTransactionService` не экспортируется из `BankingCategorizeModule` — добавить его в `exports` там.)

- [ ] **Step 2: Контроллер.** Эндпоинт `POST /cashflow-accounts/:accountId/import/1c`, принимает файл (`FileInterceptor('file')`), вызывает сервис, возвращает `Import1CResult`. Мутация — под `@RequirePermission` по образцу контроллера `CreateBankTransaction` (точный subject взять оттуда).

```ts
import { Controller, Param, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Import1CStatementService } from './commands/Import1CStatement.service';
import { Import1CResult } from './dtos/Import1CResult.dto';

@Controller('cashflow-accounts')
export class BankStatementImportController {
  constructor(private readonly import1C: Import1CStatementService) {}

  @Post(':accountId/import/1c')
  @UseInterceptors(FileInterceptor('file'))
  async import1CFile(
    @Param('accountId') accountId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('accountNumber') accountNumber: string,
    @Body('currencyCode') currencyCode: string,
  ): Promise<Import1CResult> {
    return this.import1C.import(
      Number(accountId),
      accountNumber,
      currencyCode || 'RUB',
      file.buffer,
    );
  }
}
```

- [ ] **Step 3: Подключить модуль** в агрегаторе (рядом с `FinancialModelModule`).

- [ ] **Step 4: Проверка типов.**

Run: `pnpm --filter @bigfin/server run typecheck`
Expected: без ошибок.
(Опционально, если стек поднят: запрос к `/api/cashflow-accounts/1/import/1c` без токена → 401 = модуль бутстрапит.)

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/BankStatementImport packages/server/src/app.module.ts
git commit -m "feat(bank-import): контроллер и модуль импорта выписки"
```

---

## Task 11: Lang-ключи (EN+RU, парно)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить парные ключи** (EN+RU одновременно). Минимальный набор:

```jsonc
// en
"bank_import.title": "Import bank statement",
"bank_import.upload_1c": "Upload 1C file (.txt)",
"bank_import.result": "Imported {imported}, skipped {skipped} duplicates",
"bank_import.create_contact": "Create contact",
"bank_import.counterparty_inn": "Counterparty INN",
"bank_import.parse_error": "Could not parse the statement file",
```

```jsonc
// ru
"bank_import.title": "Импорт банковской выписки",
"bank_import.upload_1c": "Загрузить файл 1С (.txt)",
"bank_import.result": "Загружено {imported}, пропущено {skipped} дублей",
"bank_import.create_contact": "Создать контрагента",
"bank_import.counterparty_inn": "ИНН контрагента",
"bank_import.parse_error": "Не удалось разобрать файл выписки",
```

- [ ] **Step 2: Проверить парность.**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: EN↔RU равны, 0 расхождений.

- [ ] **Step 3: Commit.**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(bank-import): lang-ключи импорта выписки (en+ru)"
```

---

## Task 12: Флаг на вебаппе

**Files:**
- Modify: реестр фич вебаппа (найти grep'ом `financial_model` по `packages/webapp/src` — тот же файл/enum).

- [ ] **Step 1: Зарегистрировать `bank_statement_import`** во фронтовом перечне фич по образцу `financial_model`.

- [ ] **Step 2: Проверка типов.**

Run: `pnpm --filter @bigfin/webapp run typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit.**

```bash
git commit -am "feat(bank-import): фронтовый флаг bank_statement_import"
```

---

## Task 13: Кнопка/диалог импорта 1С на странице импорта

**Files:**
- Modify: `packages/webapp/src/containers/CashFlow/ImportIUncategorizedTransactions/ImportUncategorizedTransactionsPage.tsx`
- Create: хук запроса в `packages/webapp/src/hooks/query/` (по образцу `financialModel.tsx`).

> Прочитать существующую страницу импорта и соседний query-хук для паттерна (react-query v3, как у `financialModel.tsx`).

- [ ] **Step 1: Хук мутации** `useImport1CStatement(accountId)` — POST multipart на `/cashflow-accounts/:id/import/1c`, возвращает `{ imported, skipped }`.
- [ ] **Step 2: UI** — за флагом `bank_statement_import`: блок «Загрузить файл 1С (.txt)» (input type=file, accept=".txt"), по загрузке вызвать хук, показать тост `bank_import.result` с числами. Ошибка парсинга → тост `bank_import.parse_error`. Все строки — через `intl.get`.
- [ ] **Step 3: Проверка типов + lang.**

Run: `pnpm --filter @bigfin/webapp run typecheck && node packages/webapp/scripts/lang-check.js`
Expected: без ошибок, парность ок.

- [ ] **Step 4: Commit.**

```bash
git commit -am "feat(bank-import): загрузка файла 1С на странице импорта"
```

---

## Task 14: Контрагент по ИНН + статья в экране «Разбор»

**Files:**
- Modify: `packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/` (контент/форма)
- Modify: соответствующий хук категоризации (добавить `contactId` в payload).

> Прочитать `CategorizeTransactionContent.tsx`/`CategorizeTransactionForm.schema.tsx`. Цель — показать ИНН/контрагента из строки и дать привязать/создать контрагента; передать `contactId` в существующую мутацию категоризации.

- [ ] **Step 1:** В форме категоризации показать поле «Контрагент» с автоподбором (существующий селектор контактов). Если у строки есть `payeeInn` и контакт не найден — кнопка `bank_import.create_contact` (создаёт контакт из {payee, payeeInn} через существующую мутацию создания контакта, затем подставляет его id).
- [ ] **Step 2:** Добавить `contactId` в payload категоризации (хук + schema).
- [ ] **Step 3:** Русифицировать затронутые строки (через `intl.get`); новые ключи уже в lang (Task 11).
- [ ] **Step 4: Проверка типов + lang.**

Run: `pnpm --filter @bigfin/webapp run typecheck && node packages/webapp/scripts/lang-check.js`
Expected: без ошибок.

- [ ] **Step 5: Commit.**

```bash
git commit -am "feat(bank-import): контрагент по ИНН и статья в разборе операции"
```

---

## Task 15: Финальная приёмка Фазы 1

- [ ] **Step 1: Полный typecheck.**

Run: `pnpm typecheck`
Expected: 3 пакета — exit 0.

- [ ] **Step 2: Парность lang.**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: EN↔RU равны.

- [ ] **Step 3: Серверные тесты модулей.**

Run: `pnpm --filter @bigfin/server test -- src/modules/BankStatementImport src/modules/Contacts/queries/GetContactByInn.service.spec.ts src/modules/BankingCategorize`
Expected: все новые наборы зелёные.

- [ ] **Step 4: RU-ревью.** Запустить субагента `ru-translation-reviewer` по новым ключам `bank_import.*` — без блокеров (натуральный русский, термины, бренд).

- [ ] **Step 5: Обновить память роадмапа** (`project_roadmap_execution.md`): Ф4 ⑨ Фаза 1 реализована локально, ветка `feat/bank-statement-import`, состав, грабли, остаток (живая приёмка + push/PR по запросу).

- [ ] **Step 6: Финальный commit (если остались незакоммиченные правки).**

```bash
git status --short
git commit -am "chore(bank-import): приёмка фазы 1"
```

---

## Self-review (проверка плана против спеки)

- Формат 1С (.txt, cp1251) → Tasks 3–4. ✅
- Дедуп с отчётом «N/M» → Tasks 5, 9 (+ UI Task 13). ✅
- Контрагент по ИНН + авто-создание → Tasks 8, 14. ✅
- Категоризация + контрагент на проводке → Tasks 6, 7, 14. ✅
- Миграция payee_inn/external_id/contact_id → Task 2. ✅
- Флаг `bank_statement_import` (server+web) → Tasks 1, 12. ✅
- Русификация (lang парность) → Tasks 11, 13, 14. ✅
- Направление по заголовку файла → Task 5. ✅
- Тестирование (TDD парсер/дедуп/ИНН/сервис) → Tasks 3–5, 8, 9. ✅
- Имена функций согласованы между задачами: `decodeStatementBuffer`, `parse1CStatement`, `resolveDirection`, `buildExternalId`, `Import1CStatementService.import`. ✅

---

## Остаётся вне Фазы 1 (по запросу)

- Push + PR `feat/bank-statement-import` → develop.
- **Живая приёмка** на локальном стеке: импорт реального обезличенного `.txt`, создание контрагента по ИНН, подтверждение → проводка, остаток счёта меняется; миграция `latest→rollback→latest`.
- Фаза 2 (память по контрагенту + движок правил `BankRules`).
- Фаза 3 (умное сопоставление со счетами через `BankingMatching` + CSV/Excel конкретного банка).
