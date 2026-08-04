import { describe, it, expect } from 'vitest';
import { withCamelAliases, shouldAliasResponse } from '../withCamelAliases';

describe('псевдонимы camelCase', () => {
  it('добавляет camelCase рядом с исходным ключом', () => {
    const data: any = withCamelAliases({ overdue_total: 100000 });

    expect(data.overdueTotal).toBe(100000);
    // Исходный ключ обязан остаться: на него опирается уже написанный код.
    expect(data.overdue_total).toBe(100000);
  });

  it('склеивает многословные имена', () => {
    const data: any = withCamelAliases({ payment_account_name: 'Расчётный счёт' });

    expect(data.paymentAccountName).toBe('Расчётный счёт');
  });

  it('работает вглубь — во вложенных объектах и массивах', () => {
    const data: any = withCamelAliases({
      receivable: {
        overdue_total: 100,
        contacts: [{ contact_id: 1, contact_name: 'ООО «Ромашка»' }],
      },
    });

    expect(data.receivable.overdueTotal).toBe(100);
    expect(data.receivable.contacts[0].contactId).toBe(1);
    expect(data.receivable.contacts[0].contactName).toBe('ООО «Ромашка»');
  });

  it('не трогает ключи, уже написанные слитно', () => {
    const data: any = withCamelAliases({ totalPaidOut: 5, amount: 10 });

    expect(Object.keys(data).sort()).toEqual(['amount', 'totalPaidOut']);
  });

  it('не затирает значение, если сервер прислал оба написания', () => {
    const data: any = withCamelAliases({ net_profit: 1, netProfit: 2 });

    expect(data.netProfit).toBe(2);
  });

  it('оставляет в покое ключи-данные: даты, идентификаторы, коды', () => {
    const data: any = withCamelAliases({
      '2026-01-01': 100,
      '10_20': 5,
      _private: 1,
      'РУБ_КОД': 3,
    });

    expect(Object.keys(data).sort()).toEqual(
      ['10_20', '2026-01-01', '_private', 'РУБ_КОД'].sort(),
    );
  });

  it('значения-даты остаются датами, а не разбираются по полям', () => {
    const date = new Date('2026-08-04');
    const data: any = withCamelAliases({ created_at: date });

    expect(data.createdAt).toBe(date);
    expect(data.createdAt instanceof Date).toBe(true);
  });

  it('массив в корне ответа обрабатывается', () => {
    const data: any = withCamelAliases([
      { due_amount: 100 },
      { due_amount: 200 },
    ]);

    expect(data[0].dueAmount).toBe(100);
    expect(data[1].dueAmount).toBe(200);
  });

  it('пустые значения не ломают обход', () => {
    expect(withCamelAliases(null)).toBeNull();
    expect(withCamelAliases(undefined)).toBeUndefined();
    expect(withCamelAliases(42)).toBe(42);
    expect(withCamelAliases('строка')).toBe('строка');
  });

  it('значение null у snake-поля переносится как есть', () => {
    const data: any = withCamelAliases({ variance_pct: null });

    // Пустой процент и ноль — разные вещи, псевдоним обязан сохранить null.
    expect(data.variancePct).toBeNull();
    expect('variancePct' in data).toBe(true);
  });

  it('циклическая ссылка не зацикливает обход', () => {
    const node: any = { child_id: 1 };
    node.self = node;

    const data: any = withCamelAliases(node);

    expect(data.childId).toBe(1);
  });

  it('повторяющаяся ссылка на один объект обрабатывается один раз', () => {
    const shared: any = { article_id: 7 };
    const data: any = withCamelAliases({ a: shared, b: shared });

    expect(data.a.articleId).toBe(7);
    expect(data.b.articleId).toBe(7);
  });

  it('после обхода объект по-прежнему сериализуется в JSON', () => {
    const data = withCamelAliases({ due_date: '2026-06-20' });
    const parsed = JSON.parse(JSON.stringify(data));

    expect(parsed.due_date).toBe('2026-06-20');
    expect(parsed.dueDate).toBe('2026-06-20');
  });
});

describe('ответы-словари', () => {
  it('метаданные полей ресурса не трогаем — иначе поля задвоятся', () => {
    expect(shouldAliasResponse('/api/resources/sale_invoice/meta')).toBe(false);
    expect(shouldAliasResponse('/api/resources/bill/meta/')).toBe(false);
  });

  it('обычные ответы обрабатываем', () => {
    expect(shouldAliasResponse('/api/debts/overview')).toBe(true);
    expect(shouldAliasResponse('/api/resources/sale_invoice/views')).toBe(true);
    expect(shouldAliasResponse(undefined)).toBe(true);
  });
});
