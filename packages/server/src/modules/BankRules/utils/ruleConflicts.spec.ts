// © 2026 Bigfin
import { findRuleConflicts } from './ruleConflicts';

describe('конфликт автоправил до сохранения (FT-035)', () => {
  const row = (amount: number, description: string, accountId = 1000) => ({ amount, description, accountId });
  const rows = [
    row(-1500, 'Оплата ОЗОН'),
    row(-3000, 'ОЗОН реклама'),
    row(-2000, 'Аренда'),
    row(5000, 'Возврат ОЗОН'),
  ];
  const ozon = [{ field: 'description', comparator: 'contains', value: 'озон' }];

  it('два правила на одни строки — конфликт с числом общих строк и примерами', () => {
    const conflicts = findRuleConflicts(
      { name: 'Новое', order: 5, conditions: ozon, applyIfTransactionType: 'withdrawal' },
      [
        { id: 1, name: 'Все списания > 1000', order: 0, conditions: [{ field: 'amount', comparator: 'bigger', value: '1000' }] },
        { id: 2, name: 'Аренда', order: 0, conditions: [{ field: 'description', comparator: 'contains', value: 'аренда' }] },
      ],
      rows,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ ruleId: 1, overlap: 2, winner: 'existing', sameConditions: false });
    expect(conflicts[0].samples.map((s) => s.description)).toEqual(['Оплата ОЗОН', 'ОЗОН реклама']);
  });

  it('новое правило выше по порядку — побеждает новое', () => {
    const [conflict] = findRuleConflicts(
      { name: 'Новое', order: 0, conditions: ozon },
      [{ id: 1, name: 'Старое', order: 3, conditions: ozon }],
      rows,
    );
    expect(conflict.winner).toBe('new');
  });

  it('те же условия — конфликт, даже если подходящих строк ещё нет', () => {
    const conflicts = findRuleConflicts(
      { name: 'Новое', conditions: [{ field: 'payee', comparator: 'equal', value: ' Сбер ' }] },
      [{ id: 1, name: 'Старое', conditions: [{ field: 'payee', comparator: 'equals', value: 'сбер' }] }],
      rows,
    );
    expect(conflicts).toEqual([
      expect.objectContaining({ ruleId: 1, overlap: 0, sameConditions: true }),
    ]);
  });

  it('правка правила не спорит сама с собой; правило на паузе не спорит', () => {
    expect(
      findRuleConflicts(
        { id: 1, name: 'Я', conditions: ozon },
        [
          { id: 1, name: 'Я', conditions: ozon },
          { id: 2, name: 'Пауза', conditions: ozon, pausedAt: '2026-09-01' },
        ],
        rows,
      ),
    ).toEqual([]);
  });

  it('разные счета — нет общих строк, нет конфликта', () => {
    expect(
      findRuleConflicts(
        { name: 'Новое', applyIfAccountId: 1000, conditions: ozon },
        [{ id: 1, name: 'Другой счёт', applyIfAccountId: 1001, conditions: ozon }],
        rows,
      ),
    ).toEqual([]);
  });
});
