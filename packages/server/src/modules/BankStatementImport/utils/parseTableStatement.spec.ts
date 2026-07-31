import {
  parseTableStatement,
  STATEMENT_TABLE_ERRORS,
} from './parseTableStatement';

/** Собирает CSV из строк (разделитель — точка с запятой, как у банков РФ). */
const csv = (rows: string[][]): Buffer =>
  Buffer.from(rows.map((r) => r.join(';')).join('\r\n'), 'utf8');

describe('parseTableStatement — распознавание колонок', () => {
  it('русские заголовки: дата, сумма, назначение, контрагент, ИНН', () => {
    const buf = csv([
      ['Дата', 'Сумма', 'Назначение платежа', 'Контрагент', 'ИНН'],
      ['01.06.2026', '15 000,50', 'Оплата по счёту 5', 'ООО Ромашка', '7707083893'],
    ]);

    const result = parseTableStatement(buf, 'vypiska.csv');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      date: '2026-06-01',
      amount: 15000.5,
      description: 'Оплата по счёту 5',
      payee: 'ООО Ромашка',
      payeeInn: '7707083893',
    });
  });

  it('английские заголовки', () => {
    const buf = csv([
      ['Date', 'Amount', 'Description', 'Payee'],
      ['2026-06-02', '-2500.00', 'Office rent', 'Landlord LLC'],
    ]);

    const result = parseTableStatement(buf, 'statement.csv');

    expect(result.rows[0]).toMatchObject({
      date: '2026-06-02',
      amount: -2500,
      description: 'Office rent',
    });
  });

  it('пропускает шапку банка перед строкой заголовков', () => {
    const buf = csv([
      ['Выписка по счёту 40702810000000000001'],
      ['за период с 01.06.2026 по 30.06.2026'],
      [''],
      ['Дата', 'Приход', 'Расход', 'Назначение'],
      ['03.06.2026', '1000', '', 'Поступление'],
    ]);

    const result = parseTableStatement(buf, 'v.csv');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(1000);
  });

  it('две колонки прихода и расхода дают правильный знак', () => {
    const buf = csv([
      ['Дата', 'Приход', 'Расход', 'Назначение'],
      ['03.06.2026', '1000', '', 'Поступление'],
      ['04.06.2026', '', '250,40', 'Списание'],
    ]);

    const result = parseTableStatement(buf, 'v.csv');

    expect(result.rows.map((r) => r.amount)).toEqual([1000, -250.4]);
    expect(result.warnings).not.toContain('amountSignAssumed');
  });

  it('одна колонка суммы: знак берётся из числа', () => {
    const buf = csv([
      ['Дата', 'Сумма', 'Назначение'],
      ['03.06.2026', '1000', 'Приход'],
      ['04.06.2026', '-250', 'Расход'],
    ]);

    expect(parseTableStatement(buf, 'v.csv').rows.map((r) => r.amount)).toEqual([
      1000, -250,
    ]);
  });

  it('одна колонка суммы без минусов + колонка типа операции', () => {
    const buf = csv([
      ['Дата', 'Сумма', 'Вид операции', 'Назначение'],
      ['03.06.2026', '1000', 'Зачисление', 'Приход'],
      ['04.06.2026', '250', 'Списание', 'Расход'],
    ]);

    const result = parseTableStatement(buf, 'v.csv');

    expect(result.rows.map((r) => r.amount)).toEqual([1000, -250]);
  });

  it('все суммы положительные и типа операции нет — предупреждаем о догадке', () => {
    const buf = csv([
      ['Дата', 'Сумма', 'Назначение'],
      ['03.06.2026', '1000', 'Что-то'],
    ]);

    const result = parseTableStatement(buf, 'v.csv');

    expect(result.rows[0].amount).toBe(1000);
    expect(result.warnings).toContain('amountSignAssumed');
  });

  it('нераспознанные колонки → доменная ошибка с перечнем заголовков', () => {
    const buf = csv([
      ['Колонка A', 'Колонка B'],
      ['1', '2'],
    ]);

    expect(() => parseTableStatement(buf, 'v.csv')).toThrow(
      new RegExp(STATEMENT_TABLE_ERRORS.COLUMNS_NOT_RECOGNIZED),
    );
  });
});

describe('parseTableStatement — значения', () => {
  it('понимает форматы дат ДД.ММ.ГГГГ, ГГГГ-ММ-ДД, ДД/ММ/ГГГГ', () => {
    const buf = csv([
      ['Дата', 'Сумма'],
      ['01.06.2026', '1'],
      ['2026-06-02', '2'],
      ['03/06/2026', '3'],
    ]);

    expect(parseTableStatement(buf, 'v.csv').rows.map((r) => r.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });

  it('чистит суммы от пробелов, запятых и знака валюты', () => {
    const buf = csv([
      ['Дата', 'Сумма'],
      ['01.06.2026', '1 234,56 ₽'],
      ['02.06.2026', '10 000.00'],
    ]);

    expect(parseTableStatement(buf, 'v.csv').rows.map((r) => r.amount)).toEqual([
      1234.56, 10000,
    ]);
  });

  it('пропускает пустые строки и строки без даты либо суммы', () => {
    const buf = csv([
      ['Дата', 'Сумма', 'Назначение'],
      ['01.06.2026', '100', 'ок'],
      ['', '', ''],
      ['итого', '', ''],
      ['02.06.2026', '', 'без суммы'],
    ]);

    const result = parseTableStatement(buf, 'v.csv');

    expect(result.rows).toHaveLength(1);
    // Полностью пустая строка отбрасывается ещё чтением листа и в счётчик
    // не попадает; считаются только строки с данными, но без даты/суммы.
    expect(result.skipped).toBe(2);
  });

  it('даёт устойчивый externalId, разный для разных операций', () => {
    const buf = csv([
      ['Дата', 'Сумма', 'Назначение'],
      ['01.06.2026', '100', 'первая'],
      ['01.06.2026', '100', 'вторая'],
    ]);

    const first = parseTableStatement(buf, 'v.csv').rows;
    const again = parseTableStatement(buf, 'v.csv').rows;

    expect(first[0].externalId).toBe(again[0].externalId);
    expect(first[0].externalId).not.toBe(first[1].externalId);
    expect(first[0].externalId.startsWith('table:')).toBe(true);
  });
});
