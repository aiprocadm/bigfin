import { computeRunningBalance } from './computeRunningBalance';

describe('computeRunningBalance', () => {
  it('accumulates the balance day by day', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 50, outflow: 0 },
      { date: '2026-06-02', inflow: 0, outflow: 30 },
    ]);
    expect(res.days.map((d) => d.balance)).toEqual([150, 120]);
    expect(res.gap).toBeNull();
  });

  it('detects the first cash gap (balance < 0)', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 0, outflow: 50 },
      { date: '2026-06-02', inflow: 0, outflow: 80 }, // 50 - 80 = -30
      { date: '2026-06-03', inflow: 0, outflow: 10 },
    ]);
    expect(res.gap).toEqual({
      date: '2026-06-02',
      amount: 30,
      daysFromStart: 1,
    });
  });

  it('reports a gap on the very first day', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 5 },
    ]);
    expect(res.gap).toEqual({
      date: '2026-06-01',
      amount: 5,
      daysFromStart: 0,
    });
  });

  it('avoids float drift (rounds to 3 decimals)', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0.1, outflow: 0 },
      { date: '2026-06-02', inflow: 0.2, outflow: 0 },
    ]);
    expect(res.days[1].balance).toBe(0.3);
  });
});

/**
 * Интервалы разрыва (этап 16 ТЗ-2).
 *
 * Прежний расчёт отвечал только на вопрос «когда впервые не хватит». Вопросов
 * у владельца три: КОГДА, СКОЛЬКО и ДО КАКОГО ЧИСЛА. Ниже проверяется каждый,
 * и отдельно — что прежний ответ от появления новых не съехал.
 */
describe('интервалы кассовых разрывов', () => {
  it('без разрывов список пуст, а не заполнен пустышкой', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 0, outflow: 10 },
      { date: '2026-06-02', inflow: 0, outflow: 10 },
    ]);

    expect(res.gaps).toEqual([]);
    expect(res.gap).toBeNull();
  });

  it('яма закрывается днём ВЫХОДА минус один, а не днём выхода', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 30 }, // -30
      { date: '2026-06-02', inflow: 0, outflow: 20 }, // -50
      { date: '2026-06-03', inflow: 90, outflow: 0 }, // +40 — вышли
    ]);

    expect(res.gaps).toEqual([
      {
        from: '2026-06-01',
        to: '2026-06-02',
        deepestAmount: 50,
        deepestDate: '2026-06-02',
      },
    ]);
  });

  it('ноль — это уже НЕ разрыв: денег ровно хватило', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 30 }, // -30
      { date: '2026-06-02', inflow: 30, outflow: 0 }, // ровно 0
    ]);

    expect(res.gaps).toHaveLength(1);
    expect(res.gaps[0].to).toBe('2026-06-01');
  });

  it('ДВА ПРОВАЛА не сливаются в один и не теряются', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 30 }, // -30  яма 1
      { date: '2026-06-02', inflow: 100, outflow: 0 }, // +70  вышли
      { date: '2026-06-03', inflow: 0, outflow: 200 }, // -130 яма 2
      { date: '2026-06-04', inflow: 0, outflow: 70 }, // -200 дно ямы 2
      { date: '2026-06-05', inflow: 500, outflow: 0 }, // +300 вышли
    ]);

    expect(res.gaps).toEqual([
      {
        from: '2026-06-01',
        to: '2026-06-01',
        deepestAmount: 30,
        deepestDate: '2026-06-01',
      },
      {
        from: '2026-06-03',
        to: '2026-06-04',
        deepestAmount: 200,
        deepestDate: '2026-06-04',
      },
    ]);
  });

  it('ПРОВАЛ БЕЗ ВОЗВРАТА помечается `to: null`, а не последней датой', () => {
    // Разница смысловая: «яма кончилась в последний день горизонта» и «дальше
    // мы не смотрели, выхода не видно» — разные ответы владельцу.
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 10 },
      { date: '2026-06-02', inflow: 0, outflow: 10 },
    ]);

    expect(res.gaps).toHaveLength(1);
    expect(res.gaps[0].to).toBeNull();
    expect(res.gaps[0].deepestAmount).toBe(20);
    expect(res.gaps[0].deepestDate).toBe('2026-06-02');
  });

  it('ПРОВАЛ СЕГОДНЯ: яма начинается первым же днём горизонта', () => {
    const res = computeRunningBalance(-5, [
      { date: '2026-06-01', inflow: 0, outflow: 0 },
      { date: '2026-06-02', inflow: 100, outflow: 0 },
    ]);

    expect(res.gaps[0].from).toBe('2026-06-01');
    expect(res.gaps[0].to).toBe('2026-06-01');
    expect(res.gap?.daysFromStart).toBe(0);
  });

  it('дном считается САМЫЙ ГЛУБОКИЙ день, а не первый и не последний', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 50 }, // -50
      { date: '2026-06-02', inflow: 0, outflow: 70 }, // -120  дно
      { date: '2026-06-03', inflow: 90, outflow: 0 }, // -30
      { date: '2026-06-04', inflow: 100, outflow: 0 }, // +70 — вышли
    ]);

    expect(res.gaps[0].deepestAmount).toBe(120);
    expect(res.gaps[0].deepestDate).toBe('2026-06-02');
    expect(res.gaps[0].to).toBe('2026-06-03');
  });

  it('при двух одинаково глубоких днях дном остаётся ПЕРВЫЙ', () => {
    // Иначе предупреждение уезжало бы на более позднюю дату, и владелец
    // готовил бы деньги позже, чем они на самом деле нужны.
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 40 }, // -40
      { date: '2026-06-02', inflow: 40, outflow: 40 }, // -40 тоже
    ]);

    expect(res.gaps[0].deepestDate).toBe('2026-06-01');
  });

  it('прежнее поле `gap` — это ПЕРВЫЙ день первой ямы, а не её дно', () => {
    // Регрессия: на этом поле держатся вердикт главной, оповещение о разрыве
    // и плитка дашборда. Подмени его глубиной — и три места соврали бы разом.
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 50 }, // -50  первый день
      { date: '2026-06-02', inflow: 0, outflow: 70 }, // -120 дно
    ]);

    expect(res.gap).toEqual({
      date: '2026-06-01',
      amount: 50,
      daysFromStart: 0,
    });
    expect(res.gaps[0].deepestAmount).toBe(120);
  });

  it('дробные суммы округляются так же, как остаток', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 0.1 },
      { date: '2026-06-02', inflow: 0, outflow: 0.2 },
    ]);

    expect(res.gaps[0].deepestAmount).toBe(0.3);
  });
});
