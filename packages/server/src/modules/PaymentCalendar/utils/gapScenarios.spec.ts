// © 2026 Bigfin
import { gapScenarios, simulateMoves } from './gapScenarios';

/**
 * FT-051 ТЗ-3. AC: после переноса платежа 700 000 с 10.10 на 25.10 разрыв
 * исчезает, и карточка это подтверждает.
 */
describe('сценарий «перенести платёж»', () => {
  const day = (date: string, inflow = 0, outflow = 0, lines: any[] = []) => ({ date, inflow, outflow, lines });
  const out = (id: number, amount: number, source = 'manual') => ({
    direction: 'outflow',
    amount,
    label: `план ${id}`,
    source,
    plannedOperationId: id,
  });
  // Остаток 1 000 000; 10.10 — выплата 700 000, 12.10 — 500 000;
  // 20.10 — поступление 400 000.
  const days = [
    day('2026-10-10', 0, 700_000, [out(1, 700_000)]),
    day('2026-10-12', 0, 500_000, [out(2, 500_000)]),
    day('2026-10-20', 400_000, 0),
    day('2026-10-25'),
    day('2026-10-31'),
  ];

  it('без переноса 12.10 разрыв −200 000', () => {
    expect(simulateMoves(1_000_000, days, []).gaps[0]).toMatchObject({ from: '2026-10-12', deepestAmount: 200_000 });
  });

  it('AC: перенос 700 000 с 10.10 на 25.10 убирает разрыв, и это видно без сохранения', () => {
    const result = simulateMoves(1_000_000, days, [{ plannedOperationId: 1, date: '2026-10-25' }]);
    expect(result.gaps).toEqual([]);
    // Исходные дни не тронуты — это только сценарий.
    expect(days[0].outflow).toBe(700_000);
  });

  it('кандидаты крупные первыми, у каждого — самая ранняя дата без разрыва', () => {
    const { gapDate, candidates } = gapScenarios(1_000_000, days);
    expect(gapDate).toBe('2026-10-12');
    expect(candidates.map((c) => [c.plannedOperationId, c.suggestedDate])).toEqual([
      [1, '2026-10-20'],
      [2, '2026-10-20'],
    ]);
  });

  it('повторяющиеся не предлагаются; нет спасительной даты — null', () => {
    const tight = [day('2026-10-10', 0, 2_000_000, [out(7, 1_500_000), out(8, 500_000, 'recurring')]), day('2026-10-11')];
    const { candidates } = gapScenarios(1_000_000, tight);
    expect(candidates).toEqual([
      { plannedOperationId: 7, date: '2026-10-10', amount: 1_500_000, label: 'план 7', suggestedDate: null },
    ]);
  });

  it('нет разрыва — нечего переносить', () => {
    expect(gapScenarios(10_000_000, days)).toEqual({ gapDate: null, candidates: [] });
  });
});
