import knex from 'knex';
import { LIST_CAP, applyListCap, splitCapped } from './listCap';

/**
 * С1 карты v49. Список не отдаёт всё, что накопилось.
 *
 * Замер: из 35 списочных запросов ограничение выдачи есть у 6. Остальные
 * отдают всё, что есть в базе, а витрина рисует это одним куском. Пока
 * записей десятки — незаметно; на растущем реестре заявок (заявку заводят
 * на каждый платёж) это превращается в долгую загрузку и подвисший телефон.
 *
 * Приём взят у сводки недоставленных писем: запросить на одну строку
 * больше потолка. Пришло больше — значит есть ещё, и об этом надо сказать
 * человеку, а не молча обрезать.
 */
describe('потолок выдачи списка', () => {
  it('запрашивает на одну строку больше потолка', () => {
    const kb = knex({ client: 'mysql2' }).queryBuilder().from('deals');
    applyListCap(kb);

    expect(kb.toString()).toContain(`limit ${LIST_CAP + 1}`);
  });

  it('потолок можно задать свой', () => {
    const kb = knex({ client: 'mysql2' }).queryBuilder().from('deals');
    applyListCap(kb, 10);

    expect(kb.toString()).toContain('limit 11');
  });

  it('лишняя строка не показывается человеку', () => {
    const rows = Array.from({ length: 11 }, (_, i) => i);

    expect(splitCapped(rows, 10).items).toHaveLength(10);
  });

  it('лишняя строка означает «есть ещё»', () => {
    const rows = Array.from({ length: 11 }, (_, i) => i);

    expect(splitCapped(rows, 10).truncated).toBe(true);
  });

  it('ровно потолок — это ещё не обрезка', () => {
    // Иначе человек увидел бы «показаны не все» на полном списке.
    const rows = Array.from({ length: 10 }, (_, i) => i);

    expect(splitCapped(rows, 10)).toEqual({ items: rows, truncated: false });
  });

  it('короткий список проходит как есть', () => {
    expect(splitCapped([1, 2], 10)).toEqual({ items: [1, 2], truncated: false });
  });
});
