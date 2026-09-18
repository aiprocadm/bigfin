// © 2026 Bigfin
import { ANSWER_FALLBACK, MAX_TOOL_ROUNDS, checkAnswer } from './chatAnswer';

/**
 * Этап 14 ТЗ. Ограничения §13.1 действуют полностью, и здесь острее:
 * человек СПРОСИЛ и ждёт числа. Ответ «на рекламу ушло 340 000 ₽» он примет
 * как факт и не пойдёт сверять с отчётом — ради того и спрашивал.
 */
const toolResults = [
  { rows: [{ name: 'Реклама', amount: 340_000 }, { name: 'Аренда', amount: 120_000 }] },
];
const links = ['/financial-reports/profit-loss-sheet'];

describe('checkAnswer', () => {
  it('ответ по нашим числам проходит', () => {
    const result = checkAnswer({
      text: 'На рекламу ушло 340 000 ₽.',
      question: 'Сколько мы потратили на рекламу?',
      toolResults,
      links,
    });

    expect(result.rejection).toBeNull();
  });

  it('ВЫДУМАННОЕ число отбраковывает ответ целиком', () => {
    // Не «показываем с оговоркой»: оговорку человек не прочитает,
    // а число запомнит.
    const result = checkAnswer({
      text: 'На рекламу ушло 460 000 ₽.',
      question: 'Сколько мы потратили на рекламу?',
      toolResults,
      links,
    });

    expect(result.rejection).toBe('number_not_in_data');
    expect(result.unknownNumbers).toEqual([460_000]);
  });

  it('сумма, посчитанная моделью, тоже отбраковывается', () => {
    // 340 000 + 120 000 = 460 000 — модель считать не должна,
    // и результат её счёта не проходит проверку.
    expect(
      checkAnswer({
        text: 'Всего расходов 460 000 ₽.',
        question: 'Сколько всего расходов?',
        toolResults,
        links,
      }).rejection,
    ).toBe('number_not_in_data');
  });

  it('число ИЗ ВОПРОСА не считается выдумкой', () => {
    // «Сколько потратили на рекламу в 2026 году?» — 2026 придёт в ответе,
    // и отбраковывать его нелепо: это эхо вопроса, а не утверждение.
    const result = checkAnswer({
      text: 'В 2026 году на рекламу ушло 340 000 ₽.',
      question: 'Сколько потратили на рекламу в 2026 году?',
      toolResults,
      links,
    });

    expect(result.rejection).toBeNull();
  });

  it('ответ БЕЗ ССЫЛКИ не показывается', () => {
    // ТЗ: «ответ всегда сопровождается ссылкой на отчёт». Ответ без
    // источника нечем проверить, а значит, и оспорить.
    expect(
      checkAnswer({
        text: 'На рекламу ушло 340 000 ₽.',
        question: 'Сколько?',
        toolResults,
        links: [],
      }).rejection,
    ).toBe('no_source');
  });

  it('пустой ответ не показывается', () => {
    expect(
      checkAnswer({ text: '   ', question: 'Сколько?', toolResults, links })
        .rejection,
    ).toBe('empty');
  });

  it('округление допустимо', () => {
    const result = checkAnswer({
      text: 'На рекламу ушло около 339 000 ₽.',
      question: 'Сколько?',
      toolResults,
      links,
    });

    expect(result.rejection).toBeNull();
  });

  it('ответ без чисел вовсе проходит', () => {
    // «Самое прибыльное направление — розница» тоже ответ.
    expect(
      checkAnswer({
        text: 'Самое прибыльное направление — «Розница».',
        question: 'Какой проект самый прибыльный?',
        toolResults,
        links,
      }).rejection,
    ).toBeNull();
  });
});

describe('ограничение кругов', () => {
  it('модель не может просить инструменты бесконечно', () => {
    // Без предела модель, которая не может подобрать параметры, крутилась
    // бы по кругу — и каждый круг оплачивается.
    expect(MAX_TOOL_ROUNDS).toBeGreaterThan(1);
    expect(MAX_TOOL_ROUNDS).toBeLessThanOrEqual(6);
  });
});

describe('что видит человек вместо забракованного ответа', () => {
  it('у каждой причины есть внятное объяснение', () => {
    // Молчание выглядело бы как поломка.
    (['empty', 'number_not_in_data', 'no_source'] as const).forEach((reason) => {
      expect(ANSWER_FALLBACK[reason].length).toBeGreaterThan(20);
    });
  });

  it('объяснение отправляет человека в отчёт', () => {
    expect(ANSWER_FALLBACK.number_not_in_data).toContain('отчёт');
  });
});
