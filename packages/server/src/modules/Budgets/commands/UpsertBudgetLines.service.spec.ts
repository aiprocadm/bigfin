import { UpsertBudgetLinesService } from './UpsertBudgetLines.service';

/**
 * Сохранение сетки бюджета (⑤).
 *
 * Раньше строки писались через модель Objection: `query().insert(массив)`.
 * На MySQL это всегда падало — «batch insert only works with Postgresql and
 * SQL Server», то есть бюджет было невозможно сохранить. Прежний тест этого
 * не ловил: заглушка модели покорно возвращала цепочку. Теперь пишем через
 * knex и проверяем именно его вызов.
 */
function makeDeps() {
  const merge = jest.fn().mockResolvedValue([]);
  const onConflict = jest.fn().mockReturnValue({ merge });
  const insert = jest.fn().mockReturnValue({ onConflict });
  const trx: any = jest.fn().mockReturnValue({ insert });

  const validator = {
    validateBudgetExists: jest.fn().mockResolvedValue({ id: 1 }),
  };
  // Модель нужна лишь как источник имени таблицы.
  const lineModel = () => ({ query: () => ({}) });
  const uow = { withTransaction: (cb: any) => cb(trx) };

  const service = new UpsertBudgetLinesService(
    uow as any,
    validator as any,
    lineModel as any,
  );
  return { service, validator, trx, insert, onConflict, merge };
}

const line = (over: Record<string, any> = {}) => ({
  articleId: 3,
  period: '2026-03-01',
  scenario: 'realistic',
  plannedAmount: 150000,
  ...over,
});

describe('UpsertBudgetLinesService', () => {
  it('пишет строки через knex — Objection не умеет списком на MySQL', async () => {
    const deps = makeDeps();

    await deps.service.upsert(1, { lines: [line()] } as any);

    expect(deps.trx).toHaveBeenCalledWith('budget_lines');
    expect(deps.insert).toHaveBeenCalled();
  });

  it('обновляет ячейку по её уникальному ключу, а не плодит дубли', async () => {
    const deps = makeDeps();

    await deps.service.upsert(1, { lines: [line()] } as any);

    expect(deps.onConflict).toHaveBeenCalledWith([
      'budgetId',
      'articleId',
      'period',
      'scenario',
    ]);
    expect(deps.merge).toHaveBeenCalledWith(['plannedAmount', 'updatedAt']);
  });

  it('вся сетка уходит одним запросом, а не по строке', async () => {
    const deps = makeDeps();
    const lines = Array.from({ length: 12 }, (_, i) =>
      line({ period: `2026-${String(i + 1).padStart(2, '0')}-01` }),
    );

    await deps.service.upsert(1, { lines } as any);

    expect(deps.insert).toHaveBeenCalledTimes(1);
    expect(deps.insert.mock.calls[0][0]).toHaveLength(12);
  });

  it('проставляет отметки времени сам — хуки модели в обход не сработают', async () => {
    const deps = makeDeps();

    await deps.service.upsert(1, { lines: [line()] } as any);

    const [row] = deps.insert.mock.calls[0][0];
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row).toMatchObject({
      budgetId: 1,
      articleId: 3,
      scenario: 'realistic',
      plannedAmount: 150000,
    });
  });

  it('проверяет существование бюджета до записи', async () => {
    const deps = makeDeps();

    await deps.service.upsert(7, { lines: [line()] } as any);

    expect(deps.validator.validateBudgetExists).toHaveBeenCalledWith(7);
  });

  it('пустая сетка не идёт в базу', async () => {
    const deps = makeDeps();

    const result = await deps.service.upsert(1, { lines: [] } as any);

    expect(result).toEqual([]);
    expect(deps.insert).not.toHaveBeenCalled();
  });
});
