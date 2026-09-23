// © 2026 Bigfin
import { Knex } from 'knex';

/**
 * Ярус управленческого ОПиУ предустановленным статьям (FT-009 ТЗ-3, D2).
 *
 * ПОЧЕМУ НЕ ТОЛЬКО ПО КЛЮЧУ, КАК ПИСАЛО ТЗ. ТЗ велит искать системные статьи
 * по `seed_key`. Проверка на живой базе стенда показала: у организаций,
 * заведённых до 20.09, ключ есть ТОЛЬКО у балансовых статей — их добавляла
 * догоняющая миграция этапа 17. Доходно-расходные системные статьи («Выручка»,
 * «Аренда», «ФОТ»…) заводил старый сид, который ключей не писал. Сид «только
 * по ключу» прошёл бы у них мимо всех девяти статей, критерий приёмки
 * «у предустановленных статей ярус заполнен» формально выполнился бы — а
 * управленческий ОПиУ у каждой старой организации показал бы все деньги
 * строкой «Не отнесено к ярусу».
 *
 * Поэтому статья узнаётся по ключу, а если ключа нет — по ПОДПИСИ исходного
 * сида: то же имя, тот же вид, тот же родитель. Имена системных статей не
 * менялись с первой версии сида (июль 2026), а имена статей уникальны —
 * двух «Аренд» в организации быть не может. Статью, которую человек
 * переименовал, подпись не узнает — и это правильно: она остаётся без яруса
 * и видна отдельной строкой, а не получает чужой ярус молча.
 *
 * Ключ старым статьям здесь НЕ проставляется: ключ делает статью системной
 * (её нельзя удалить и сменить ей вид), а менять права на статьи — не дело
 * миграции яруса.
 *
 * СВОЙ ЯРУС ЧЕЛОВЕКА НЕ ПЕРЕЗАПИСЫВАЕТСЯ: пишем только туда, где пусто.
 *
 * СВОЯ КОПИЯ ТАБЛИЦЫ. Миграция — исторический документ: если однажды сид
 * поменяет ярусы по умолчанию, уже прошедшая миграция не должна вести себя
 * иначе. За тем, что копия сейчас совпадает с сидом, следит
 * `plTypeSeed.spec.ts`.
 */
export const PL_TYPE_SEED_SYSTEM_ARTICLES = [
  { key: 'income', name: 'Доходы', kind: 'income', parent: null, plType: 'revenue' },
  { key: 'revenue', name: 'Выручка', kind: 'income', parent: 'income', plType: 'revenue' },
  { key: 'expense', name: 'Расходы', kind: 'expense', parent: null, plType: 'administrative' },
  { key: 'cogs', name: 'Себестоимость', kind: 'expense', parent: 'expense', plType: 'direct_variable' },
  { key: 'rent', name: 'Аренда', kind: 'expense', parent: 'expense', plType: 'administrative' },
  { key: 'payroll', name: 'ФОТ', kind: 'expense', parent: 'expense', plType: 'administrative' },
  { key: 'marketing', name: 'Маркетинг', kind: 'expense', parent: 'expense', plType: 'commercial' },
  { key: 'taxes', name: 'Налоги', kind: 'expense', parent: 'expense', plType: 'below_ebitda' },
  { key: 'other', name: 'Прочее', kind: 'expense', parent: 'expense', plType: 'administrative' },
] as const;

const PL_TYPE_SEED_TABLE = 'management_articles';

interface PlTypeSeedRow {
  id: number;
  name: string;
  kind: string;
  parentId: number | null;
  seedKey: string | null;
  plType: string | null;
}

/**
 * Поле строки результата.
 *
 * Продукт отображает имена в ВЕРХНИЙ регистр, а ответ базы обратно — в
 * camelCase: колонка `PARENT_ID` приезжает как `parentId`. Соседняя миграция
 * сида балансовых статей читает `row.parent_id ?? row.PARENT_ID` — и не видит
 * ни одного значения. Здесь читаем все три написания.
 */
function plTypeSeedField(row: any, camel: string, snake: string) {
  return row[camel] ?? row[snake] ?? row[snake.toUpperCase()] ?? null;
}

async function plTypeSeedHasColumn(knex: Knex): Promise<boolean> {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'management_articles'
        AND LOWER(column_name) = 'pl_type'`,
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

async function plTypeSeedLoadRows(knex: Knex): Promise<PlTypeSeedRow[]> {
  const rows: any[] = await knex(PL_TYPE_SEED_TABLE).select(
    'id',
    'name',
    'kind',
    'parent_id',
    'seed_key',
    'pl_type',
  );

  return rows.map((row) => ({
    id: Number(plTypeSeedField(row, 'id', 'id')),
    name: String(plTypeSeedField(row, 'name', 'name') ?? ''),
    kind: String(plTypeSeedField(row, 'kind', 'kind') ?? ''),
    parentId:
      plTypeSeedField(row, 'parentId', 'parent_id') == null
        ? null
        : Number(plTypeSeedField(row, 'parentId', 'parent_id')),
    seedKey: plTypeSeedField(row, 'seedKey', 'seed_key'),
    plType: plTypeSeedField(row, 'plType', 'pl_type'),
  }));
}

/**
 * Находит системные статьи: ключ системной статьи → строка базы.
 *
 * Родители в таблице идут раньше детей, поэтому родитель ребёнка к моменту
 * его поиска уже найден. Подпись требует ровно ОДНОГО кандидата: два
 * одинаковых — значит, данные не те, что мы думаем, и безопаснее пройти мимо.
 */
export function plTypeSeedMatchSystemArticles(
  rows: PlTypeSeedRow[],
): Map<string, PlTypeSeedRow> {
  const found = new Map<string, PlTypeSeedRow>();

  PL_TYPE_SEED_SYSTEM_ARTICLES.forEach((entry) => {
    const byKey = rows.filter((row) => row.seedKey === entry.key);
    if (byKey.length === 1) {
      found.set(entry.key, byKey[0]);
      return;
    }

    const parentRow = entry.parent ? found.get(entry.parent) : null;
    // Родитель не узнан — не узнаём и ребёнка: подпись без родителя слишком
    // слабая.
    if (entry.parent && !parentRow) return;

    const bySignature = rows.filter(
      (row) =>
        row.seedKey == null &&
        row.name === entry.name &&
        row.kind === entry.kind &&
        (entry.parent == null
          ? row.parentId == null
          : row.parentId === parentRow!.id),
    );
    if (bySignature.length === 1) found.set(entry.key, bySignature[0]);
  });

  return found;
}

export async function up(knex: Knex): Promise<void> {
  if (!(await plTypeSeedHasColumn(knex))) return;

  const found = plTypeSeedMatchSystemArticles(await plTypeSeedLoadRows(knex));

  for (const entry of PL_TYPE_SEED_SYSTEM_ARTICLES) {
    const row = found.get(entry.key);
    if (!row || row.plType != null) continue;

    await knex(PL_TYPE_SEED_TABLE)
      .where('id', row.id)
      .update({ pl_type: entry.plType });
  }
}

/**
 * Откат снимает ярус только там, где он всё ещё тот, что поставила миграция.
 * Ярус, который человек успел поменять, остаётся: это уже его настройка.
 */
export async function down(knex: Knex): Promise<void> {
  if (!(await plTypeSeedHasColumn(knex))) return;

  const found = plTypeSeedMatchSystemArticles(await plTypeSeedLoadRows(knex));

  for (const entry of PL_TYPE_SEED_SYSTEM_ARTICLES) {
    const row = found.get(entry.key);
    if (!row || row.plType !== entry.plType) continue;

    await knex(PL_TYPE_SEED_TABLE).where('id', row.id).update({ pl_type: null });
  }
}
