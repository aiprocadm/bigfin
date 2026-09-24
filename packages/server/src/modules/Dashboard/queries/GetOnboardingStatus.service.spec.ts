// © 2026 Bigfin
import { GetOnboardingStatusService } from './GetOnboardingStatus.service';

/**
 * Сборщик сигналов онбординга (FT-095 ТЗ-3): что именно он спрашивает у
 * базы и как переживает сбой. Подделка базы запоминает таблицу и условия
 * каждого запроса и отвечает числом из карты `counts`.
 */
type Call = { table: string; whereIn: any[]; whereNull: string[] };

const fakeKnex = (counts: Record<string, number>, failing: string[] = []) => {
  const calls: Call[] = [];
  const knex: any = (table: string) => {
    const call: Call = { table, whereIn: [], whereNull: [] };
    calls.push(call);
    const builder: any = {
      whereIn: (column: string, values: any[]) => {
        call.whereIn.push([column, values]);
        return builder;
      },
      whereNull: (column: string) => {
        call.whereNull.push(column);
        return builder;
      },
      count: () => builder,
      first: () =>
        failing.includes(table)
          ? Promise.reject(new Error(`no table ${table}`))
          : // Отображение имён отдаёт псевдоним в верблюжьем виде.
            Promise.resolve({ total: counts[table] ?? 0 }),
    };
    return builder;
  };
  return { knex, calls };
};

const settingsStore = (values: Record<string, string>) => () =>
  ({
    get: ({ key }: { key: string }, fallback: any) => values[key] ?? fallback,
  }) as any;

const build = (
  counts: Record<string, number>,
  prefs: Record<string, unknown> = {},
  options: { failing?: string[]; settings?: Record<string, string> } = {},
) => {
  const { knex, calls } = fakeKnex(counts, options.failing);
  const displayPreferences: any = {
    getPreferences: jest.fn().mockResolvedValue({
      onboardingSkipped: [],
      onboardingReportBuilt: false,
      ...prefs,
    }),
  };
  const tenancyContext: any = {
    getSystemUser: jest.fn().mockResolvedValue({ id: 42 }),
  };
  const service = new GetOnboardingStatusService(
    () => knex,
    settingsStore(options.settings ?? {}),
    displayPreferences,
    tenancyContext,
  );
  return { service, calls, displayPreferences };
};

const stepOf = (status: any, key: string) =>
  status.steps.find((step: any) => step.key === key);

describe('GetOnboardingStatusService', () => {
  it('новая организация: только владелец, ничего не сделано', async () => {
    const { service } = build({ users: 1 });
    const status = await service.getStatus();
    expect(status.done).toBe(0);
    expect(status.total).toBe(8);
  });

  it('счёт человека — это денежный счёт без отметки сида', async () => {
    const { service, calls } = build({ accounts: 1, users: 1 });
    const status = await service.getStatus();

    const accounts = calls.find((call) => call.table === 'accounts')!;
    expect(accounts.whereIn).toEqual([
      ['account_type', ['bank', 'cash', 'credit-card']],
    ]);
    expect(accounts.whereNull).toEqual(['seeded_at']);
    expect(stepOf(status, 'account').done).toBe(true);
  });

  it('статьи: своя статья или привязка счёта', async () => {
    const own = await build({ management_articles: 1 }).service.getStatus();
    const mapped = await build({
      management_article_accounts: 2,
    }).service.getStatus();
    expect(stepOf(own, 'articles').done).toBe(true);
    expect(stepOf(mapped, 'articles').done).toBe(true);
  });

  it('выписка: пакет импорта (не откаченный) или строки «Разбора»', async () => {
    const { service, calls } = build({ import_batches: 1 });
    expect(stepOf(await service.getStatus(), 'statement').done).toBe(true);
    expect(
      calls.find((call) => call.table === 'import_batches')!.whereNull,
    ).toEqual(['rolled_back_at']);

    const legacy = await build({
      uncategorized_cashflow_transactions: 3,
    }).service.getStatus();
    expect(stepOf(legacy, 'statement').done).toBe(true);
  });

  it('банк: подключён по API — учётные данные в настройках', async () => {
    const { service } = build(
      {},
      {},
      { settings: { alfa_credentials: JSON.stringify({ kind: 'oauth' }) } },
    );
    expect(stepOf(await service.getStatus(), 'bank').done).toBe(true);
  });

  it('банк: подключён через Plaid', async () => {
    const status = await build({ plaid_items: 1 }).service.getStatus();
    expect(stepOf(status, 'bank').done).toBe(true);
  });

  it('отчёт и пропуски берутся из личных настроек ЭТОГО человека', async () => {
    const { service, displayPreferences } = build(
      {},
      { onboardingReportBuilt: true, onboardingSkipped: ['team'] },
    );
    const status = await service.getStatus();

    expect(displayPreferences.getPreferences).toHaveBeenCalledWith(42);
    expect(stepOf(status, 'report').done).toBe(true);
    expect(stepOf(status, 'team').skipped).toBe(true);
    expect(status.total).toBe(7);
  });

  it('таблицы нет — шаг просто не сделан, шапка не падает', async () => {
    const { service } = build(
      { accounts: 1, bank_rules: 1 },
      {},
      { failing: ['bank_rules'] },
    );
    const status = await service.getStatus();
    expect(stepOf(status, 'account').done).toBe(true);
    expect(stepOf(status, 'rule').done).toBe(false);
  });
});
