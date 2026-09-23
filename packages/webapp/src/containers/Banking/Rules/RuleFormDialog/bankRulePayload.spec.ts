import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  getNumberFieldConditions,
  getTextFieldConditions,
  initialValues,
  splitSharesTotal,
  toBankRulePayload,
} from './_utils';

/**
 * Форма автоправила → запрос (FT-030…FT-032 ТЗ-3) и сверка операторов
 * экрана с сервером.
 */
describe('форма автоправила', () => {
  const base = { ...initialValues, name: 'Озон' } as any;

  it('«Заполнить поля»: пустые поля — null, «оба направления» — null', () => {
    const payload = toBankRulePayload({
      ...base,
      applyIfTransactionType: '',
      assignAccountId: '1021',
      assignProjectId: '',
      assignContactId: '5',
    });
    expect(payload).toMatchObject({
      ruleType: 'assign',
      applyIfAccountId: null,
      applyIfTransactionType: null,
      assignAccountId: 1021,
      assignProjectId: null,
      assignContactId: 5,
    });
    expect(payload).not.toHaveProperty('splits');
    expect(payload).not.toHaveProperty('transferToAccountId');
  });

  it('«Разбить»: доли числами, поля «заполнить» не отправляются', () => {
    const payload: any = toBankRulePayload({
      ...base,
      ruleType: 'split',
      assignAccountId: '1021',
      splits: [
        { sharePercent: '70', articleId: '10', projectId: '1' },
        { sharePercent: '30', articleId: '11', projectId: '' },
      ],
    });
    expect(payload.splits).toEqual([
      { sharePercent: 70, articleId: 10, projectId: 1 },
      { sharePercent: 30, articleId: 11, projectId: null },
    ]);
    expect(payload).not.toHaveProperty('assignAccountId');
  });

  it('«Перевод»: только счёт-получатель', () => {
    const payload = toBankRulePayload({
      ...base,
      ruleType: 'transfer',
      applyIfAccountId: '1000',
      transferToAccountId: '1001',
    });
    expect(payload).toMatchObject({
      ruleType: 'transfer',
      applyIfAccountId: 1000,
      transferToAccountId: 1001,
    });
    expect(payload).not.toHaveProperty('assignContactId');
  });

  it('сумма долей считается без дробного мусора', () => {
    expect(
      splitSharesTotal([
        { sharePercent: '33.3333' },
        { sharePercent: '33.3333' },
        { sharePercent: '33.3334' },
      ] as any),
    ).toBe(100);
  });

  it('каждый оператор экрана понимает сервер', () => {
    const server = fs.readFileSync(
      path.resolve(__dirname, '../../../../../../server/src/modules/BankRules/utils/matchRule.ts'),
      'utf8',
    );
    const block = server.slice(server.indexOf('export const RULE_COMPARATORS = ['));
    const known = [...block.slice(0, block.indexOf(']')).matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(known.length).toBeGreaterThan(5);
    const screen = [...getTextFieldConditions(), ...getNumberFieldConditions()].map((o) => o.value);
    expect(screen.filter((value) => !known.includes(value))).toEqual([]);
  });
});
