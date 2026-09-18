// © 2026 Bigfin
import { buildInsightsPrompt, parseInsightsResponse } from './insightsPrompt';

/**
 * Этап 13 ТЗ. Сборка запроса и разбор ответа.
 *
 * Самая важная проверка здесь — что сборка ЛОМАЕТСЯ на приватных полях.
 */
describe('buildInsightsPrompt', () => {
  const input = {
    period: 'III квартал 2026',
    rows: [
      { label: 'Закупки', amount: 2_800_000, previousAmount: 1_000_000 },
      { label: 'Розница', amount: -180_000, share: 0.31 },
    ],
  };

  it('в промпт попадают числа и названия статей', () => {
    const prompt = buildInsightsPrompt(input);

    expect(prompt).toContain('Закупки');
    expect(prompt).toContain('2800000');
    expect(prompt).toContain('III квартал 2026');
  });

  it('модели прямо запрещено считать', () => {
    // §13.1 п. 1. Это вежливость, а не защита (защита — сверка чисел),
    // но убирать её незачем.
    expect(buildInsightsPrompt(input)).toContain('НИЧЕГО НЕ СЧИТАЙ');
  });

  it('ПРИВАТНОЕ ПОЛЕ ЛОМАЕТ сборку', () => {
    // Проверка стоит в единственной точке, где данные превращаются в текст
    // для отправки наружу. Поставь её в вызывающем коде — и однажды
    // появится второй вызывающий, который забудет её сделать.
    expect(() =>
      buildInsightsPrompt({
        period: 'III квартал 2026',
        rows: [
          { label: 'Закупки', amount: 100, description: 'Оплата Иванову И.И.' } as any,
        ],
      }),
    ).toThrow(/нельзя отправлять наружу/);
  });

  it('ИНН в данных ломает сборку', () => {
    expect(() =>
      buildInsightsPrompt({
        period: 'III квартал 2026',
        rows: [{ label: 'ООО', amount: 100, inn: '7707083893' } as any],
      }),
    ).toThrow();
  });
});

describe('parseInsightsResponse', () => {
  it('разбирает чистый JSON', () => {
    expect(
      parseInsightsResponse('[{"text":"Закупки выросли.","reportKey":"pl"}]'),
    ).toEqual([{ text: 'Закупки выросли.', reportKey: 'pl' }]);
  });

  it('переживает ограждение и пояснения модели', () => {
    // Модель почти всегда оборачивает JSON, хотя её просили не делать этого.
    // Сутки без выводов из-за лишней строки — плохой обмен.
    const raw = 'Вот наблюдения:\n```json\n[{"text":"Закупки выросли."}]\n```\nГотово.';

    expect(parseInsightsResponse(raw)).toEqual([
      { text: 'Закупки выросли.', reportKey: null },
    ]);
  });

  it('неразобранный ответ даёт ПУСТО, а не выдуманные наблюдения', () => {
    // Не разобрали значит не разобрали.
    expect(parseInsightsResponse('Извините, не могу помочь.')).toEqual([]);
    expect(parseInsightsResponse('[сломанный json')).toEqual([]);
    expect(parseInsightsResponse('')).toEqual([]);
  });

  it('пустые наблюдения выбрасываются', () => {
    expect(parseInsightsResponse('[{"text":"  "},{"text":"Есть."}]')).toEqual([
      { text: 'Есть.', reportKey: null },
    ]);
  });

  it('не массив — это пусто', () => {
    expect(parseInsightsResponse('[1,2,3]')).toEqual([]);
  });
});
