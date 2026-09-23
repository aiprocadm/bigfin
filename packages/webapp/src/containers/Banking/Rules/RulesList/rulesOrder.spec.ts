import { describe, expect, it } from 'vitest';

import { moveItem, orderChanged, sortRulesByOrder } from './rulesOrder';
import {
  initialValues,
  toBankRulePayload,
  toConflictDraft,
} from '../RuleFormDialog/_utils';

describe('порядок автоправил (FT-035)', () => {
  it('перетаскивание переносит правило на новое место, остальные сдвигаются', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    // Мимо списка — ничего не меняется.
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('список показывается в порядке срабатывания; при равном — созданные раньше', () => {
    const sorted = sortRulesByOrder([
      { id: 3, order: 0 },
      { id: 1, order: 2 },
      { id: 2, order: 0 },
    ]);
    expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it('без изменений запрос не шлётся', () => {
    expect(orderChanged([1, 2, 3], [1, 2, 3])).toBe(false);
    expect(orderChanged([1, 2, 3], [2, 1, 3])).toBe(true);
  });
});

describe('правило «сделка» и черновик конфликта (FT-033, FT-035)', () => {
  const base = { ...initialValues, name: 'Аванс' } as any;

  it('«сделка»: статья, сделка и этап; направления у правила нет', () => {
    const payload: any = toBankRulePayload({
      ...base,
      ruleType: 'deal',
      applyIfTransactionType: 'deposit',
      assignAccountId: '1026',
      assignDealId: '12',
      assignDealStageId: '',
      assignProjectId: '3',
    });
    expect(payload).toMatchObject({
      ruleType: 'deal',
      assignAccountId: 1026,
      assignDealId: 12,
      assignDealStageId: null,
    });
    expect(payload).not.toHaveProperty('assignProjectId');
  });

  it('черновик конфликта — только охват правила, без действий', () => {
    const draft: any = toConflictDraft(
      { ...base, applyIfAccountId: '1000', assignAccountId: '1021' },
      7,
    );
    expect(draft).toEqual({
      id: 7,
      order: 0,
      applyIfAccountId: 1000,
      applyIfTransactionType: 'deposit',
      conditionsType: 'and',
      conditions: base.conditions,
    });
  });
});
