// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { fromApi } from './fromApi';

/**
 * Сервер переводит КАЖДЫЙ ответ в змеиный вид. Новый код витрины читает
 * верблюжий. Без перевода поле оказывается `undefined` — молча.
 */
describe('перевод ответа сервера', () => {
  it('переводит имена полей', () => {
    expect(fromApi({ net_assets: 5, has_balance: true })).toEqual({
      netAssets: 5,
      hasBalance: true,
    });
  });

  it('идёт вглубь, включая списки', () => {
    // Строки таблиц приходят списком, и их поля тоже змеиные: без обхода
    // вглубь таблица статей рисовалась бы пустыми ячейками.
    const value = {
      top_articles: [
        { article_id: 1, previous_amount: 10, is_new: true },
      ],
      split: { fixed_share: 0.5 },
    };

    expect(fromApi(value)).toEqual({
      topArticles: [{ articleId: 1, previousAmount: 10, isNew: true }],
      split: { fixedShare: 0.5 },
    });
  });

  it('ЗНАЧЕНИЯ не трогает', () => {
    // «cash_gap» — это вид события, а не имя поля. Перевести его значило бы
    // сломать сравнение с тем, что ждёт сервер.
    expect(fromApi({ event_type: 'cash_gap' })).toEqual({
      eventType: 'cash_gap',
    });
  });

  it('не ломается на пустоте', () => {
    expect(fromApi(null)).toBeNull();
    expect(fromApi(undefined)).toBeUndefined();
    expect(fromApi([])).toEqual([]);
  });

  it('оставляет уже верблюжьи имена как есть', () => {
    expect(fromApi({ alreadyCamel: 1 })).toEqual({ alreadyCamel: 1 });
  });

  it('дату оставляет датой', () => {
    // Обойти дату как обычный объект значило бы превратить её в набор полей.
    const date = new Date('2026-09-19T00:00:00Z');

    expect(fromApi<any>({ created_at: date }).createdAt).toBe(date);
  });

  it('число и строку возвращает как есть', () => {
    expect(fromApi(5)).toBe(5);
    expect(fromApi('some_value')).toBe('some_value');
  });
});
