// © 2026 Bigfin
import { findMatchingRule, listValues, parseAmount, ruleMatches } from './matchRule';

const row = (amount: number, description = '', payee = '', accountId = 1) => ({
  amount,
  description,
  payee,
  accountId,
});

describe('автоправило: совпадение (FT-030)', () => {
  const ozon = {
    id: 1,
    conditionsType: 'and',
    conditions: [
      { field: 'description', comparator: 'contains', value: 'ОЗОН' },
      { field: 'amount', comparator: 'bigger', value: '1000' },
    ],
  };

  it('приёмка ТЗ: «содержит ОЗОН» И «сумма > 1000» — только оба сразу', () => {
    expect(ruleMatches(ozon, row(-1500, 'Оплата ozon / Озон маркет'))).toBe(true);
    expect(ruleMatches(ozon, row(-500, 'Оплата Озон'))).toBe(false);
    expect(ruleMatches(ozon, row(-1500, 'Wildberries'))).toBe(false);
  });

  it('в режиме ИЛИ хватает одного условия', () => {
    const either = { ...ozon, conditionsType: 'or' };
    expect(ruleMatches(either, row(-500, 'Оплата Озон'))).toBe(true);
    expect(ruleMatches(either, row(-1500, 'Wildberries'))).toBe(true);
    expect(ruleMatches(either, row(-10, 'Wildberries'))).toBe(false);
  });

  it('текст без регистра и «ё»: «не содержит» больше не пропускает другой регистр', () => {
    const notOzon = { conditions: [{ field: 'payee', comparator: 'not_contains', value: 'ozon' }] };
    expect(ruleMatches(notOzon, row(-1, '', 'OZON LLC'))).toBe(false);
    expect(ruleMatches(notOzon, row(-1, '', 'Ёлка'))).toBe(true);
    const yo = { conditions: [{ field: 'payee', comparator: 'equals', value: 'елка' }] };
    expect(ruleMatches(yo, row(-1, '', '  Ёлка ')))
      .toBe(true);
  });

  it('старое написание «not_contain» и «equal» понимается', () => {
    expect(
      ruleMatches({ conditions: [{ field: 'payee', comparator: 'not_contain', value: 'x' }] }, row(1, '', 'abc')),
    ).toBe(true);
    expect(
      ruleMatches({ conditions: [{ field: 'amount', comparator: 'equal', value: '10' }] }, row(-10)),
    ).toBe(true);
  });

  it('новые операторы: не равно, начинается с, любой из списка', () => {
    const cond = (field: string, comparator: string, value: string) => ({
      conditions: [{ field, comparator, value }],
    });
    expect(ruleMatches(cond('payee', 'starts_with', 'ИП '), row(1, '', 'ИП Иванов'))).toBe(true);
    expect(ruleMatches(cond('payee', 'starts_with', 'ИП '), row(1, '', 'ООО ИП'))).toBe(false);
    expect(ruleMatches(cond('payee', 'not_equals', 'Сбер'), row(1, '', 'Тинькофф'))).toBe(true);
    expect(ruleMatches(cond('payee', 'in_list', 'Сбер; Тинькофф\nАльфа'), row(1, '', 'альфа'))).toBe(true);
    expect(ruleMatches(cond('payee', 'in_list', 'Сбер; Тинькофф'), row(1, '', 'Альфа'))).toBe(false);
    expect(ruleMatches(cond('amount', 'in_list', '1 000,50; 20'), row(-1000.5))).toBe(true);
  });

  it('сумма — по модулю, с копейками и запятой', () => {
    const cond = { conditions: [{ field: 'amount', comparator: 'bigger_or_equal', value: '1 000,00' }] };
    expect(ruleMatches(cond, row(-1000))).toBe(true);
    expect(ruleMatches(cond, row(999.99))).toBe(false);
    expect(parseAmount('1 000,50')).toBe(1000.5);
    expect(listValues('a;;b\n c ')).toEqual(['a', 'b', 'c']);
  });

  it('тип операции: поступление, списание и «оба» (раньше «оба» не срабатывало)', () => {
    const base = { conditions: [{ field: 'amount', comparator: 'bigger', value: '0' }] };
    expect(ruleMatches({ ...base, applyIfTransactionType: 'deposit' }, row(-5))).toBe(false);
    expect(ruleMatches({ ...base, applyIfTransactionType: 'withdrawal' }, row(-5))).toBe(true);
    expect(ruleMatches({ ...base, applyIfTransactionType: null }, row(5))).toBe(true);
    expect(ruleMatches({ ...base, applyIfTransactionType: null }, row(-5))).toBe(true);
  });

  it('счёт: правило «для любого счёта» срабатывает (раньше — никогда)', () => {
    const base = { conditions: [{ field: 'amount', comparator: 'bigger', value: '0' }] };
    expect(ruleMatches({ ...base, applyIfAccountId: null }, row(5, '', '', 7))).toBe(true);
    expect(ruleMatches({ ...base, applyIfAccountId: 7 }, row(5, '', '', 7))).toBe(true);
    expect(ruleMatches({ ...base, applyIfAccountId: 8 }, row(5, '', '', 7))).toBe(false);
  });

  it('правило на паузе и правило без условий не срабатывают', () => {
    const base = { conditions: [{ field: 'amount', comparator: 'bigger', value: '0' }] };
    expect(ruleMatches({ ...base, pausedAt: '2026-09-01' }, row(5))).toBe(false);
    expect(ruleMatches({ conditions: [] }, row(5))).toBe(false);
  });

  it('первое по порядку правило побеждает; при равном порядке — созданное раньше', () => {
    const any = [{ field: 'amount', comparator: 'bigger', value: '0' }];
    const rules = [
      { id: 3, order: 1, conditions: any },
      { id: 2, order: 0, conditions: any },
      { id: 1, order: 0, conditions: any },
    ];
    expect(findMatchingRule(rules, row(5))!.id).toBe(1);
  });
});
