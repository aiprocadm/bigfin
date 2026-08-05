import { insertMany } from './insert-many';

/**
 * Заглушка knex: `trx(table)` возвращает построитель, у него insert/onConflict/
 * ignore/merge. Awaiting построителя завершает вставку.
 */
function makeTrx() {
  const calls: any = { table: null, rows: null, onConflict: null, mode: null };

  const builder: any = {
    insert: jest.fn((rows: any) => {
      calls.rows = rows;
      return builder;
    }),
    onConflict: jest.fn((cols: any) => {
      calls.onConflict = cols;
      return builder;
    }),
    ignore: jest.fn(() => {
      calls.mode = 'ignore';
      return Promise.resolve([]);
    }),
    merge: jest.fn((cols: any) => {
      calls.mode = cols;
      return Promise.resolve([]);
    }),
    then: (resolve: any) => Promise.resolve([]).then(resolve),
  };

  const trx: any = jest.fn((table: string) => {
    calls.table = table;
    return builder;
  });
  return { trx, calls, builder };
}

const rows = [{ name: 'первая' }, { name: 'вторая' }];

describe('пакетная вставка', () => {
  it('пишет все строки одним запросом через knex', async () => {
    const { trx, calls, builder } = makeTrx();

    const count = await insertMany(trx, 'planned_operations', rows);

    expect(count).toBe(2);
    expect(calls.table).toBe('planned_operations');
    expect(builder.insert).toHaveBeenCalledTimes(1);
    expect(calls.rows).toHaveLength(2);
  });

  it('проставляет отметки времени — в обход модели её хуки не работают', async () => {
    const { trx, calls } = makeTrx();

    await insertMany(trx, 'planned_operations', rows);

    expect(calls.rows[0].createdAt).toBeInstanceOf(Date);
    expect(calls.rows[0].updatedAt).toBeInstanceOf(Date);
  });

  it('не затирает отметки времени, если их задали явно', async () => {
    const { trx, calls } = makeTrx();
    const own = new Date('2020-01-01');

    await insertMany(trx, 'т', [{ name: 'a', createdAt: own }]);

    expect(calls.rows[0].createdAt).toBe(own);
  });

  it('умеет вставлять без отметок времени', async () => {
    const { trx, calls } = makeTrx();

    await insertMany(trx, 'т', rows, { timestamps: false });

    expect(calls.rows[0].createdAt).toBeUndefined();
  });

  it('по конфликту уникального ключа умеет пропускать строку', async () => {
    const { trx, calls } = makeTrx();

    await insertMany(trx, 'notification_reads', rows, {
      onConflict: ['notificationId', 'userId'],
      conflict: 'ignore',
    });

    expect(calls.onConflict).toEqual(['notificationId', 'userId']);
    expect(calls.mode).toBe('ignore');
  });

  it('по конфликту умеет обновлять перечисленные поля', async () => {
    const { trx, calls } = makeTrx();

    await insertMany(trx, 'budget_lines', rows, {
      onConflict: ['budgetId'],
      conflict: ['plannedAmount'],
    });

    expect(calls.mode).toEqual(['plannedAmount']);
  });

  it('пустой список не идёт в базу', async () => {
    const { trx, builder } = makeTrx();

    const count = await insertMany(trx, 'т', []);

    expect(count).toBe(0);
    expect(builder.insert).not.toHaveBeenCalled();
  });
});
