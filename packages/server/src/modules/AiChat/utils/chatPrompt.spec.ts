// © 2026 Bigfin
import { buildChatPrompt, parseModelStep } from './chatPrompt';

/**
 * Этап 14 ТЗ. Модель на каждом круге делает одно из двух: просит инструмент
 * или отвечает.
 */
describe('buildChatPrompt', () => {
  const input = { question: 'Сколько потратили на рекламу?', transcript: [] };

  it('в промпте перечислены инструменты с параметрами', () => {
    const prompt = buildChatPrompt(input);

    expect(prompt).toContain('get_profit_loss');
    expect(prompt).toContain('fromDate');
  });

  it('модели прямо запрещено считать', () => {
    expect(buildChatPrompt(input)).toContain('НИЧЕГО НЕ СЧИТАЙ САМ');
  });

  it('вопрос человека попадает в промпт', () => {
    expect(buildChatPrompt(input)).toContain('Сколько потратили на рекламу?');
  });

  it('уже полученные данные попадают в промпт', () => {
    // Иначе модель просила бы один и тот же инструмент по кругу.
    const prompt = buildChatPrompt({
      ...input,
      transcript: ['Инструмент get_profit_loss вернул: {"Реклама":340000}'],
    });

    expect(prompt).toContain('Что уже известно');
    expect(prompt).toContain('340000');
  });
});

describe('parseModelStep', () => {
  it('разбирает просьбу об инструменте', () => {
    const step = parseModelStep(
      '{"tool":"get_profit_loss","params":{"fromDate":"2026-07-01"}}',
    );

    expect(step).toEqual({
      kind: 'tool',
      call: { tool: 'get_profit_loss', params: { fromDate: '2026-07-01' } },
    });
  });

  it('разбирает ответ человеку', () => {
    expect(parseModelStep('{"answer":"На рекламу ушло 340 000 ₽."}')).toEqual({
      kind: 'answer',
      text: 'На рекламу ушло 340 000 ₽.',
    });
  });

  it('переживает ограждение вокруг JSON', () => {
    expect(
      parseModelStep('```json\n{"answer":"Готово."}\n```'),
    ).toEqual({ kind: 'answer', text: 'Готово.' });
  });

  it('НЕРАЗОБРАННЫЙ шаг — пустой ответ, а НЕ вызов инструмента', () => {
    // Догадываться, какой инструмент она имела в виду, — прямой путь
    // к уверенному неверному ответу по не тому отчёту.
    expect(parseModelStep('Извините, не понял.')).toEqual({
      kind: 'answer',
      text: '',
    });
    expect(parseModelStep('{сломанный')).toEqual({ kind: 'answer', text: '' });
    expect(parseModelStep('')).toEqual({ kind: 'answer', text: '' });
  });

  it('объект без tool и без answer — пустой ответ', () => {
    expect(parseModelStep('{"что-то":"другое"}')).toEqual({
      kind: 'answer',
      text: '',
    });
  });

  it('ответ важнее инструмента, если пришло и то и другое', () => {
    // Модель иногда присылает оба поля. Ответ — это конец разговора,
    // и трактовать его как «сходи ещё раз» значило бы зациклиться.
    expect(
      parseModelStep('{"answer":"Готово.","tool":"get_profit_loss"}'),
    ).toEqual({ kind: 'answer', text: 'Готово.' });
  });
});
