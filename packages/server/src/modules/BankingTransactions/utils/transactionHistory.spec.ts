// © 2026 Bigfin
import { auditSubjectOf, buildTransactionHistory } from './transactionHistory';

describe('история изменений операции (FT-026)', () => {
  it('журнал и автоправила — одной лентой, свежее сверху, кто — словами', () => {
    const items = buildTransactionHistory(
      [
        {
          id: 1,
          createdAt: '2026-09-01 10:00:00',
          action: 'created',
          tenantUser: { firstName: 'Демо', lastName: 'Стенд' },
          metadata: { amount: 1000 },
        },
        {
          id: 2,
          createdAt: '2026-09-03 09:00:00',
          action: 'tagged',
          tenantUser: { email: 'a@b.ru' },
          metadata: { tag: 'маркетинг', oldTag: null },
        },
      ],
      [
        { id: 7, appliedAt: '2026-09-02 12:00:00', ruleName: null, changes: '{"ruleName":"Озон","splits":[]}' },
      ],
    );
    expect(items.map((i) => [i.source, i.action, i.actor])).toEqual([
      ['user', 'tagged', 'a@b.ru'],
      // Правило удалено — название берётся из самого следа.
      ['rule', 'rule_applied', 'Озон'],
      ['user', 'created', 'Демо Стенд'],
    ]);
    expect(items[0].details).toEqual({ tag: 'маркетинг', oldTag: null });
  });

  it('одинаковое время не теряет записей', () => {
    const at = '2026-09-01 10:00:00';
    const items = buildTransactionHistory(
      [{ id: 1, createdAt: at, action: 'created' }],
      [{ id: 1, appliedAt: at, changes: null }],
    );
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.key)).size).toBe(2);
  });

  it('вид документа → имя в журнале: иначе история проводки и оплаты поставщику пуста', () => {
    expect(auditSubjectOf('CashflowTransaction')).toBe('Cashflow');
    expect(auditSubjectOf('Journal')).toBe('ManualJournal');
    expect(auditSubjectOf('BillPayment')).toBe('PaymentMade');
    expect(auditSubjectOf('PaymentReceive')).toBe('PaymentReceive');
  });
});
