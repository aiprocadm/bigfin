// © 2026 Bigfin
import { ApplyBankRuleService } from './ApplyBankRule.service';
import { RecognizeTranasctionsService } from './RecognizeTranasctions.service';
import { applyRulesJobId } from '../events/TriggerRecognizedTransactions';

/**
 * Автоправило разносит строку выписки само (FT-030…FT-032 ТЗ-3): тем же
 * путём, что человек, а отказ разноски не роняет пакет.
 */
const row = (id: number, amount: number, extra: Record<string, any> = {}) =>
  ({ id, amount, accountId: 1000, date: '2026-01-10', description: 'Оплата ОЗОН', payee: 'ООО Озон', currencyCode: 'RUB', ...extra }) as any;

function makeApplier(options: { failCategorize?: string } = {}) {
  const calls: any = { categorize: [], saveSplits: [], revert: [], write: [], applications: [], tags: [] };
  const categorize = {
    categorize: async (id: number, dto: any) => {
      if (options.failCategorize) {
        const error: any = new Error('нельзя');
        error.errorType = options.failCategorize;
        throw error;
      }
      calls.categorize.push({ id, dto });
    },
  };
  const gl = {
    revertJournalEntries: async (id: number) => calls.revert.push(id),
    writeJournalEntries: async (id: number) => calls.write.push(id),
  };
  const splits = { saveSplits: async (input: any) => calls.saveSplits.push(input) };
  const uncategorized = () => ({
    query: () => ({ findById: async () => ({ categorizeRefId: 555 }) }),
  });
  const articleAccounts = () => ({
    query: () => ({
      whereIn: () => ({
        orderBy: async () => [
          { articleId: 10, accountId: 1021 },
          { articleId: 11, accountId: 1022 },
        ],
      }),
    }),
  });
  const service = new ApplyBankRuleService(
    categorize as any,
    gl as any,
    splits as any,
    uncategorized as any,
    articleAccounts as any,
    // Журнал применений (FT-036).
    (() => ({ query: () => ({ insert: async (data: any) => calls.applications.push(data) }) })) as any,
    // Этап 44 сделки 12 (FT-033).
    (() => ({ query: () => ({ findById: async (id: number) => (id === 44 ? { id: 44, dealId: 12 } : null) }) })) as any,
    // Метки операций (FT-025).
    (() => ({
      query: () => ({
        findOne: async () => null,
        insert: async (data: any) => calls.tags.push(data),
      }),
    })) as any,
  );
  return { service, calls };
}

describe('применение автоправила к строке', () => {
  it('метка из правила ставится операции (FT-025), без метки — не ставится', async () => {
    const tagged = makeApplier();
    await tagged.service.apply({ ruleType: 'assign', assignAccountId: 1021, assignTag: 'маркетинг' }, row(1, -1500));
    expect(tagged.calls.tags).toEqual([
      { referenceType: 'CashflowTransaction', referenceId: 555, tag: 'маркетинг' },
    ]);
    expect(JSON.parse(tagged.calls.applications[0].changes).tag).toBe('маркетинг');

    const plain = makeApplier();
    await plain.service.apply({ ruleType: 'assign', assignAccountId: 1021 }, row(1, -1500));
    expect(plain.calls.tags).toEqual([]);
  });

  it('«Заполнить поля»: разноска со статьёй, контрагентом и направлением', async () => {
    const { service, calls } = makeApplier();
    const outcome = await service.apply(
      { ruleType: 'assign', assignAccountId: 1021, assignContactId: 5, assignProjectId: 3 },
      row(1, -1500),
    );
    expect(outcome).toEqual({ uncategorizedTransactionId: 1, status: 'applied' });
    expect(calls.categorize[0].dto).toMatchObject({
      transactionType: 'other_expense',
      creditAccountId: 1021,
      contactId: 5,
      projectId: 3,
      description: 'Оплата ОЗОН',
    });
    expect(calls.saveSplits).toEqual([]);
  });

  it('«Разбить»: части записаны, проводки пересобраны по частям', async () => {
    const { service, calls } = makeApplier();
    await service.apply(
      {
        ruleType: 'split',
        splits: [
          { sharePercent: 70, articleId: 10, projectId: 1, sortOrder: 0 },
          { sharePercent: 30, articleId: 11, projectId: 2, sortOrder: 1 },
        ],
      },
      row(2, -100000),
    );
    expect(calls.saveSplits[0]).toEqual({
      referenceType: 'CashflowTransaction',
      referenceId: 555,
      parentAmount: 100000,
      lines: [
        { amount: 70000, articleId: 10, projectId: 1 },
        { amount: 30000, articleId: 11, projectId: 2 },
      ],
    });
    expect(calls.revert).toEqual([555]);
    expect(calls.write).toEqual([555]);
  });

  it('отказ разноски — «пропущено» с причиной, не падение', async () => {
    const { service } = makeApplier({ failCategorize: 'EXCHANGE_RATE_REQUIRED' });
    const outcome = await service.apply({ ruleType: 'assign', assignAccountId: 1 }, row(3, -10));
    expect(outcome).toEqual({
      uncategorizedTransactionId: 3,
      status: 'skipped',
      reason: 'EXCHANGE_RATE_REQUIRED',
    });
  });

  it('уже разнесённая строка не трогается', async () => {
    const { service, calls } = makeApplier();
    const outcome = await service.apply(
      { ruleType: 'assign', assignAccountId: 1 },
      row(4, -10, { categorized: true }),
    );
    expect(outcome.reason).toBe('already_categorized');
    expect(calls.categorize).toEqual([]);
  });
});

describe('распознавание по автоправилам', () => {
  function makeRecognizer(rows: any[], rules: any[]) {
    const recognized: Array<[number, number]> = [];
    const applied: number[] = [];
    let nextId = 1;
    const uncategorized = () => ({
      query: () => ({
        onBuild: async () => rows,
        findById: () => ({ patch: async () => undefined }),
      }),
    });
    const recognizedModel = () => ({
      query: () => ({
        insert: async (data: any) => {
          recognized.push([data.uncategorizedTransactionId, data.bankRuleId]);
          return { id: nextId++ };
        },
      }),
    });
    const ruleModel = () => ({ query: () => ({ onBuild: async () => rules }) });
    const applier = {
      apply: async (_rule: any, r: any) => {
        applied.push(r.id);
        return { uncategorizedTransactionId: r.id, status: 'applied' };
      },
    };
    const service = new RecognizeTranasctionsService(
      uncategorized as any,
      recognizedModel as any,
      ruleModel as any,
      applier as any,
    );
    return { service, recognized, applied };
  }

  const any = [{ field: 'description', comparator: 'contains', value: 'озон' }];

  it('правило «для любого счёта» срабатывает (раньше — никогда)', async () => {
    const { service, recognized } = makeRecognizer(
      [row(1, -10)],
      [{ id: 7, order: 0, applyIfAccountId: null, applyIfTransactionType: 'withdrawal', conditions: any }],
    );
    await service.recognizeTransactions();
    expect(recognized).toEqual([[1, 7]]);
  });

  it('разносит только с флагом apply; без флага — лишь распознаёт', async () => {
    const rules = [{ id: 7, conditions: any }];
    const quiet = makeRecognizer([row(1, -10)], rules);
    await quiet.service.recognizeTransactions();
    expect(quiet.applied).toEqual([]);

    const eager = makeRecognizer([row(1, -10), row(2, -20, { description: 'Аренда' })], rules);
    const result = await eager.service.recognizeTransactions(undefined, undefined, undefined, { apply: true });
    expect(eager.applied).toEqual([1]);
    expect(result.recognized).toBe(1);
  });

  it('правило на паузе не срабатывает', async () => {
    const { service, recognized } = makeRecognizer([row(1, -10)], [
      { id: 7, pausedAt: '2026-09-01', conditions: any },
    ]);
    await service.recognizeTransactions();
    expect(recognized).toEqual([]);
  });

  it('номер склеенной задачи один в окне и разный у разных окон и счетов', () => {
    const t = 1_700_000_000_000;
    expect(applyRulesJobId('org', 1000, t)).toBe(applyRulesJobId('org', 1000, t + 5));
    expect(applyRulesJobId('org', 1000, t)).not.toBe(applyRulesJobId('org', 1001, t));
    expect(applyRulesJobId('org', 1000, t)).not.toBe(applyRulesJobId('org', 1000, t + 20_000));
  });
});

describe('след применения и правило «сделка» (FT-033, FT-036)', () => {
  it('каждое применение пишет след: правило, операция и что поставлено', async () => {
    const { service, calls } = makeApplier();
    await service.apply(
      { id: 7, name: 'Озон', ruleType: 'assign', assignAccountId: 1021, assignProjectId: 3 },
      row(1, -1500),
    );
    expect(calls.applications).toHaveLength(1);
    const record = calls.applications[0];
    expect(record).toMatchObject({ transactionId: 555, ruleId: 7 });
    expect(JSON.parse(record.changes)).toMatchObject({
      ruleName: 'Озон',
      creditAccountId: 1021,
      projectId: 3,
      uncategorizedTransactionId: 1,
    });
  });

  it('пропущенная строка следа не оставляет', async () => {
    const { service, calls } = makeApplier({ failCategorize: 'X' });
    await service.apply({ id: 7, ruleType: 'assign', assignAccountId: 1 }, row(1, -1));
    expect(calls.applications).toEqual([]);
  });

  it('«сделка» по этапу: сделка берётся у этапа, этап — в следе', async () => {
    const { service, calls } = makeApplier();
    const outcome = await service.apply(
      { id: 9, name: 'Аванс', ruleType: 'deal', assignAccountId: 1026, assignDealStageId: 44 },
      row(2, 50000),
    );
    expect(outcome.status).toBe('applied');
    expect(calls.categorize[0].dto).toMatchObject({ projectId: 12, transactionType: 'other_income' });
    expect(JSON.parse(calls.applications[0].changes)).toMatchObject({ dealId: 12, dealStageId: 44 });
  });

  it('«сделка» без сделки и этапа — пропуск с причиной', async () => {
    const { service } = makeApplier();
    const outcome = await service.apply({ id: 9, ruleType: 'deal', assignAccountId: 1026 }, row(3, 10));
    expect(outcome).toMatchObject({ status: 'skipped', reason: 'no_deal' });
  });
});

