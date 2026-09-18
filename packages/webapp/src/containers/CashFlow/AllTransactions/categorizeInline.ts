/**
 * Разнос операции одним движением прямо из строки списка (этап 3 ТЗ, п. 3.1).
 *
 * Приёмка этапа требует: «разнести 10 операций подряд можно без единого
 * открытия модального окна». Поэтому строка сама умеет отправить разноску —
 * человек только выбирает статью.
 *
 * Здесь собрана вся логика без React, чтобы её можно было проверить тестами:
 * какой тип операции подставить, из каких счетов выбирать статью и что именно
 * уходит на сервер.
 */

/** Приход или расход — по заполненной стороне операции. */
export const isDepositRow = (row: any): boolean => Number(row?.deposit) > 0;

/**
 * Тип операции для разноса одним движением.
 *
 * Полный набор типов (взнос собственника, перевод между счетами и прочие)
 * остаётся в подробной форме разноски. В строке подставляем самый обычный
 * случай: пришли деньги — прочий доход, ушли — прочий расход. Именно эти два
 * типа ждут статью из доходов и расходов соответственно.
 */
export const inlineTransactionType = (row: any): 'other_income' | 'other_expense' =>
  isDepositRow(row) ? 'other_income' : 'other_expense';

/** Корневой тип счетов, из которых выбирается статья для этой строки. */
export const inlineAccountRootType = (row: any): 'income' | 'expense' =>
  isDepositRow(row) ? 'income' : 'expense';

/** Оставляет только счета нужного корня — доходы или расходы. */
export const pickAccountsForRow = (row: any, accounts: any[] = []): any[] => {
  const rootType = inlineAccountRootType(row);

  return accounts.filter((account: any) => {
    // Ответ сервера приходит в змеином написании, но в части мест счета
    // приезжают и в верблюжьем — принимаем оба, иначе список молча пустеет.
    const accountRoot = account?.account_root_type ?? account?.accountRootType;
    return accountRoot === rootType;
  });
};

/**
 * Подсказка от правила разноски: сервер кладёт её в строку, когда правило
 * сработало. Одно нажатие — и операция разнесена в эту статью.
 */
export const suggestedAccount = (
  row: any,
): { id: number; name: string } | null => {
  const id = row?.assigned_account_id;
  const name = row?.assigned_account_name;

  return id && name ? { id: Number(id), name: String(name) } : null;
};

/** Тело запроса разноски одной строки. Ключи змеиные — как ждёт сервер. */
export const buildCategorizePayload = (row: any, accountId: number) => ({
  uncategorized_transaction_ids: [Number(row.id)],
  date: row.date,
  credit_account_id: Number(accountId),
  transaction_type: inlineTransactionType(row),
  exchange_rate: 1,
  // Назначение платежа переносим в операцию: иначе после разноски строка
  // теряет единственное, по чему её узнают в отчётах.
  ...(row.description ? { description: row.description } : {}),
  ...(row.contact_id ? { contact_id: Number(row.contact_id) } : {}),
});

/**
 * Разнос НЕСКОЛЬКИХ выделенных строк разом (этап 3 ТЗ, п. 3.1 — массовые
 * действия).
 *
 * Ручка сервера принимает список, но одним запросом можно разнести только
 * однородное выделение: тип операции и статья у прихода и расхода разные.
 * Если человек выделил и то и другое, честнее сказать об этом, чем молча
 * разнести половину или, хуже, увести поступления в расходную статью.
 */
export type BulkSide = 'in' | 'out' | 'mixed' | 'empty';

/** Какая сторона у выделения: только приход, только расход или вперемешку. */
export const bulkSide = (rows: any[]): BulkSide => {
  if (!rows || rows.length === 0) return 'empty';

  const hasDeposit = rows.some((row) => isDepositRow(row));
  const hasWithdrawal = rows.some((row) => !isDepositRow(row));

  if (hasDeposit && hasWithdrawal) return 'mixed';
  return hasDeposit ? 'in' : 'out';
};

/** Тело запроса разноски для выделенных строк одной стороны. */
export const buildBulkCategorizePayload = (rows: any[], accountId: number) => {
  const side = bulkSide(rows);

  if (side === 'empty' || side === 'mixed') {
    throw new Error(
      'Разносить разом можно только поступления или только списания.',
    );
  }
  const [first] = rows;

  return {
    uncategorized_transaction_ids: rows.map((row) => Number(row.id)),
    // Дата обязательна для сервера. У разных строк она разная, поэтому берём
    // дату первой: собственные даты операций сервер сохраняет сам по каждой
    // строке выписки.
    date: first.date,
    credit_account_id: Number(accountId),
    transaction_type: inlineTransactionType(first),
    exchange_rate: 1,
  };
};
