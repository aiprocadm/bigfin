// © 2026 Bigfin
import { findPrivacyViolations } from './aiPrivacy';
import { buildAggregates, changePercent } from './buildAggregates';

/**
 * Этап 13 ТЗ, §13.1 п. 2. Сбор агрегатов — первое сужение данных: берём
 * только название, суммы и долю.
 */
describe('buildAggregates', () => {
  const base = {
    reportKey: 'profit_loss',
    link: '/financial-reports/profit-loss-sheet',
  };

  it('из строки отчёта берутся только разрешённые поля', () => {
    // САМАЯ ВАЖНАЯ проверка сбора: забыть добавить поле безопасно,
    // забыть запретить — нет.
    const rows = buildAggregates({
      ...base,
      current: [
        {
          name: 'Закупки',
          amount: 100,
          id: 7,
          accountId: 12,
          description: 'Оплата Иванову И.И.',
          inn: '7707083893',
        } as any,
      ],
    });

    expect(findPrivacyViolations(rows)).toEqual([]);
    expect(Object.keys(rows[0]).sort()).toEqual([
      'amount',
      'label',
      'link',
      'reportKey',
      'share',
    ]);
  });

  it('прошлый период подставляется по названию', () => {
    const rows = buildAggregates({
      ...base,
      current: [{ name: 'Закупки', amount: 2_800_000 }],
      previous: [{ name: 'Закупки', amount: 1_000_000 }],
    });

    expect(rows[0].previousAmount).toBe(1_000_000);
    expect(rows[0].changePercent).toBe(180);
  });

  it('новой статьи прошлого нет — и доли роста нет', () => {
    const rows = buildAggregates({
      ...base,
      current: [{ name: 'Новая', amount: 500 }],
      previous: [{ name: 'Старая', amount: 100 }],
    });

    expect(rows[0].previousAmount).toBeUndefined();
    expect(rows[0].changePercent).toBeUndefined();
  });

  it('самые крупные строки идут первыми', () => {
    // Справочник бывает на две сотни строк, платить за них незачем —
    // итог двигают крупные.
    const rows = buildAggregates({
      ...base,
      current: [
        { name: 'Мелочь', amount: 10 },
        { name: 'Крупное', amount: -1_000 },
        { name: 'Среднее', amount: 100 },
      ],
      limit: 2,
    });

    expect(rows.map((r) => r.label)).toEqual(['Крупное', 'Среднее']);
  });

  it('доля считается от суммы модулей', () => {
    // Доля от суммы СО ЗНАКАМИ даёт бессмыслицу вроде «340%», когда доходы
    // и расходы гасят друг друга в знаменателе.
    const rows = buildAggregates({
      ...base,
      current: [
        { name: 'Доход', amount: 100 },
        { name: 'Расход', amount: -100 },
      ],
    });

    expect(rows[0].share).toBe(0.5);
    expect(rows[1].share).toBe(0.5);
  });

  it('пустой отчёт не роняет сбор', () => {
    expect(buildAggregates({ ...base, current: [] })).toEqual([]);
  });

  it('строка с нечисловой суммой выбрасывается', () => {
    const rows = buildAggregates({
      ...base,
      current: [{ name: 'Плохая', amount: NaN }, { name: 'Ок', amount: 10 }],
    });

    expect(rows.map((r) => r.label)).toEqual(['Ок']);
  });
});

describe('changePercent', () => {
  it('обычный рост', () => {
    expect(changePercent(150, 100)).toBe(50);
  });

  it('рост С НУЛЯ доли не имеет', () => {
    // «Выросло на 100%» с нуля — это не рост, это появление.
    expect(changePercent(150, 0)).toBeUndefined();
  });

  it('прошлого нет — доли нет', () => {
    expect(changePercent(150, undefined)).toBeUndefined();
  });

  it('падение отрицательное', () => {
    expect(changePercent(50, 100)).toBe(-50);
  });

  it('от отрицательной базы считается по модулю', () => {
    // Убыток −100 стал убытком −50: это улучшение на 50%, а не на −50%.
    expect(changePercent(-50, -100)).toBe(50);
  });
});
