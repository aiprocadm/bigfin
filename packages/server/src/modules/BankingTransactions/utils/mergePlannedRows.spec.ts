// © 2026 Bigfin
import { mergePlannedRows } from './mergePlannedRows';

/**
 * Слияние планов с фактом в реестре (FIN-010 ТЗ-2).
 *
 * Самая дорогая ошибка здесь — ДУБЛЬ: материализованный план, показанный и
 * планом, и фактом, удваивает платёж на экране и в итогах. Причём выглядит
 * это правдоподобно — две одинаковые строки с одной датой.
 */
const fact = (date: string, extra: Record<string, any> = {}) => ({
  date,
  referenceType: 'Expense',
  referenceId: 1,
  ...extra,
});

describe('слияние планов с фактом', () => {
  it('планы попадают в список и помечаются источником', () => {
    const rows = mergePlannedRows(
      [fact('2026-09-01')],
      [{ id: 5, date: '2026-10-01', status: 'planned' }],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].source).toBe('planned');
    expect(rows[1].source).toBe('fact');
  });

  it('МАТЕРИАЛИЗОВАННЫЙ план не дублируется фактом', () => {
    const rows = mergePlannedRows(
      [fact('2026-09-01', { referenceType: 'Expense', referenceId: 42 })],
      [
        {
          id: 5,
          date: '2026-09-01',
          status: 'planned',
          sourceType: 'Expense',
          sourceId: 42,
        },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('fact');
  });

  it('план с чужим документом остаётся: это другая операция', () => {
    const rows = mergePlannedRows(
      [fact('2026-09-01', { referenceId: 42 })],
      [
        {
          id: 5,
          date: '2026-09-02',
          status: 'planned',
          sourceType: 'Expense',
          sourceId: 99,
        },
      ],
    );

    expect(rows).toHaveLength(2);
  });

  it('исполненный или отменённый план в список не идёт', () => {
    const rows = mergePlannedRows(
      [fact('2026-09-01')],
      [
        { id: 5, date: '2026-10-01', status: 'materialized' },
        { id: 6, date: '2026-10-02', status: 'cancelled' },
      ],
    );

    expect(rows).toHaveLength(1);
  });

  it('НА ВТОРОЙ СТРАНИЦЕ планов нет', () => {
    // Реестр отсортирован по дате убыванию, планы — это будущее: они всегда
    // впереди любого факта. Строка «завтрашний платёж» посреди
    // прошлогодних операций выглядела бы ошибкой, а при прокрутке
    // повторилась бы на каждой странице.
    const rows = mergePlannedRows(
      [fact('2025-01-01')],
      [{ id: 5, date: '2026-10-01', status: 'planned' }],
      false,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('fact');
  });

  it('порядок по дате убыванию сохраняется', () => {
    const rows = mergePlannedRows(
      [fact('2026-09-05'), fact('2026-09-01')],
      [
        { id: 5, date: '2026-09-10', status: 'planned' },
        { id: 6, date: '2026-09-03', status: 'planned' },
      ],
    );

    expect(rows.map((row) => row.date)).toEqual([
      '2026-09-10',
      '2026-09-05',
      '2026-09-03',
      '2026-09-01',
    ]);
  });

  it('в один день план идёт перед фактом', () => {
    // Человек открывает реестр, чтобы узнать, что ПРЕДСТОИТ; прошедшее он
    // уже видел.
    const rows = mergePlannedRows(
      [fact('2026-09-05')],
      [{ id: 5, date: '2026-09-05', status: 'planned' }],
    );

    expect(rows[0].source).toBe('planned');
  });

  it('без планов список фактов не меняется', () => {
    const facts = [fact('2026-09-05'), fact('2026-09-01')];
    const rows = mergePlannedRows(facts, []);

    expect(rows.map((row) => row.date)).toEqual(['2026-09-05', '2026-09-01']);
    expect(rows.every((row) => row.source === 'fact')).toBe(true);
  });

  it('пустые входные данные не роняют слияние', () => {
    expect(mergePlannedRows()).toEqual([]);
    expect(mergePlannedRows(undefined, undefined)).toEqual([]);
  });
});
