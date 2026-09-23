// © 2026 Bigfin
import { planRuleCategorization, snakeType } from './ruleCategorization';

describe('план разноски по автоправилу', () => {
  const accounts = new Map<number, number>([
    [10, 1021],
    [11, 1022],
  ]);

  it('«Заполнить поля»: статья, контрагент, направление; вид — по направлению денег', () => {
    const plan = planRuleCategorization(
      { ruleType: 'assign', assignAccountId: 1021, assignContactId: 5, assignProjectId: 3 },
      { amount: -1500 },
      accounts,
    );
    expect(plan).toEqual({
      transactionType: 'other_expense',
      creditAccountId: 1021,
      contactId: 5,
      projectId: 3,
      splits: [],
    });
  });

  it('вид операции из правила берётся, только если он того же направления', () => {
    const drawing = { ruleType: 'assign', assignAccountId: 1, assignCategory: 'OwnerDrawing' };
    expect((planRuleCategorization(drawing, { amount: -1 }, accounts) as any).transactionType).toBe(
      'owner_drawing',
    );
    // Списание владельца на поступление — нельзя, берётся обычный доход.
    expect((planRuleCategorization(drawing, { amount: 1 }, accounts) as any).transactionType).toBe(
      'other_income',
    );
    // Перевод через «заполнить поля» не делается: для него свой тип правила.
    const transfer = { ruleType: 'assign', assignAccountId: 1, assignCategory: 'transfer_to_account' };
    expect((planRuleCategorization(transfer, { amount: -1 }, accounts) as any).transactionType).toBe(
      'other_expense',
    );
  });

  it('«Разбить»: 100 000 × 70/30 — части с направлениями, счёт первой статьи', () => {
    const plan = planRuleCategorization(
      {
        ruleType: 'split',
        splits: [
          { sharePercent: 30, articleId: 11, projectId: 2, sortOrder: 1 },
          { sharePercent: 70, articleId: 10, projectId: 1, contactId: 9, sortOrder: 0 },
        ],
      },
      { amount: -100000 },
      accounts,
    ) as any;
    expect(plan.creditAccountId).toBe(1021);
    expect(plan.contactId).toBe(9);
    expect(plan.splits).toEqual([
      { amount: 70000, articleId: 10, projectId: 1 },
      { amount: 30000, articleId: 11, projectId: 2 },
    ]);
  });

  it('«Разбить» со статьёй без счёта — пропуск с причиной', () => {
    expect(
      planRuleCategorization(
        { ruleType: 'split', splits: [{ sharePercent: 100, articleId: 99 }] },
        { amount: -1 },
        accounts,
      ),
    ).toEqual({ skip: 'split_article_without_account' });
  });

  it('«Перевод»: направление перевода по знаку суммы, без контрагента и направления', () => {
    const rule = { ruleType: 'transfer', transferToAccountId: 1001, assignContactId: 5 };
    expect(planRuleCategorization(rule, { amount: -10 }, accounts)).toMatchObject({
      transactionType: 'transfer_to_account',
      creditAccountId: 1001,
      contactId: null,
      projectId: null,
    });
    expect((planRuleCategorization(rule, { amount: 10 }, accounts) as any).transactionType).toBe(
      'transfer_from_account',
    );
  });

  it('нулевая сумма, правило без счёта и тип «сделка» (этап 35) — пропуск', () => {
    expect(planRuleCategorization({ ruleType: 'assign', assignAccountId: 1 }, { amount: 0 }, accounts)).toEqual({
      skip: 'zero_amount',
    });
    expect(planRuleCategorization({ ruleType: 'assign' }, { amount: 1 }, accounts)).toEqual({
      skip: 'no_account',
    });
    expect(planRuleCategorization({ ruleType: 'deal' }, { amount: 1 }, accounts)).toEqual({
      skip: 'unsupported_rule_type',
    });
    expect(snakeType('TransferToAccount')).toBe('transfer_to_account');
  });
});
