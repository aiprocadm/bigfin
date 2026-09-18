// © 2026 Bigfin
import { CHAT_TOOLS, findTool } from './chatTools';
import { MAX_PERIOD_DAYS, validateToolCall } from './toolCallValidation';

/**
 * Этап 14 ТЗ. Модель выбирает инструмент и параметры сама — и ошибается.
 *
 * Главное правило: ни одну её ошибку нельзя «поправить за неё». Догадка
 * однажды подставит не тот отчёт, и ответ будет уверенным и неверным.
 */
const ok = (result: any) => 'call' in result;
const why = (result: any) => result.rejection?.problem;

describe('validateToolCall', () => {
  it('правильный запрос проходит', () => {
    const result = validateToolCall({
      tool: 'get_profit_loss',
      params: { fromDate: '2026-07-01', toDate: '2026-09-30' },
    });

    expect(ok(result)).toBe(true);
  });

  it('НЕСУЩЕСТВУЮЩИЙ инструмент отвергается, а не угадывается', () => {
    // «Она, наверное, имела в виду ОПиУ» однажды подставит не тот отчёт.
    const result = validateToolCall({ tool: 'get_revenue', params: {} });

    expect(why(result)).toBe('unknown_tool');
  });

  it('в отказе назван сам инструмент', () => {
    // Модель читает причину и исправляется со второй попытки.
    const result: any = validateToolCall({ tool: 'get_revenue' });

    expect(result.rejection.detail).toContain('get_revenue');
  });

  it('не хватает обязательного параметра — отказ', () => {
    expect(
      why(validateToolCall({ tool: 'get_profit_loss', params: { fromDate: '2026-07-01' } })),
    ).toBe('missing_param');
  });

  it('ЛИШНИЙ параметр отвергается, а не отбрасывается молча', () => {
    // Модель думает, что сузила запрос («только по рекламе»), а получила бы
    // весь отчёт и приняла его за ответ на свой суженный вопрос.
    expect(
      why(
        validateToolCall({
          tool: 'get_profit_loss',
          params: { fromDate: '2026-07-01', toDate: '2026-09-30', article: 'Реклама' },
        }),
      ),
    ).toBe('unknown_param');
  });

  it('дата словами не проходит', () => {
    expect(
      why(
        validateToolCall({
          tool: 'get_profit_loss',
          params: { fromDate: 'прошлый квартал', toDate: '2026-09-30' },
        }),
      ),
    ).toBe('bad_date');
  });

  it('НЕСУЩЕСТВУЮЩАЯ дата не проходит', () => {
    // «2026-02-31» проходит по виду, но JS молча превратит её в 3 марта,
    // и отчёт посчитается не за тот период.
    expect(
      why(
        validateToolCall({
          tool: 'get_profit_loss',
          params: { fromDate: '2026-02-31', toDate: '2026-09-30' },
        }),
      ),
    ).toBe('bad_date');
  });

  it('перепутанные даты не проходят', () => {
    // Иначе отчёт вышел бы пустым, а модель сказала бы «за этот период
    // ничего не было» — и это звучало бы как факт.
    expect(
      why(
        validateToolCall({
          tool: 'get_profit_loss',
          params: { fromDate: '2026-09-30', toDate: '2026-07-01' },
        }),
      ),
    ).toBe('period_reversed');
  });

  it('слишком длинный период не проходит', () => {
    expect(
      why(
        validateToolCall({
          tool: 'get_profit_loss',
          params: { fromDate: '2000-01-01', toDate: '2026-09-30' },
        }),
      ),
    ).toBe('period_too_long');
  });

  it('период на границе допустимого проходит', () => {
    // Граница должна работать, иначе запрет съедал бы законные запросы.
    const from = new Date('2024-01-01T00:00:00Z');
    const to = new Date(from.getTime() + MAX_PERIOD_DAYS * 86_400_000);

    expect(
      ok(
        validateToolCall({
          tool: 'get_profit_loss',
          params: {
            fromDate: '2024-01-01',
            toDate: to.toISOString().slice(0, 10),
          },
        }),
      ),
    ).toBe(true);
  });

  it('баланс просит только дату', () => {
    expect(
      ok(validateToolCall({ tool: 'get_balance_sheet', params: { toDate: '2026-09-30' } })),
    ).toBe(true);
  });
});

describe('перечень инструментов', () => {
  it('инструмента «произвольный запрос» НЕТ', () => {
    // Он свёл бы на нет весь смысл: модель снова получила бы доступ
    // к данным напрямую.
    const names = CHAT_TOOLS.map((tool) => tool.name).join(' ');

    expect(names).not.toMatch(/sql|query|raw|execute/i);
  });

  it('у каждого инструмента есть ссылка на отчёт', () => {
    // §13.1 п. 3 действует полностью: ответ всегда ведёт в отчёт.
    expect(CHAT_TOOLS.every((tool) => tool.link.startsWith('/'))).toBe(true);
  });

  it('у каждого инструмента есть описание для модели', () => {
    // Без описания модель выберет наугад.
    expect(CHAT_TOOLS.every((tool) => tool.description.length > 20)).toBe(true);
  });

  it('вопросы из ТЗ покрыты инструментами', () => {
    // «Сколько потратили на рекламу», «какой проект самый прибыльный»,
    // «когда ближайший кассовый разрыв».
    expect(findTool('get_profit_loss')).not.toBeNull();
    expect(findTool('get_deals_margin')).not.toBeNull();
    expect(findTool('get_cash_gaps')).not.toBeNull();
  });
});
