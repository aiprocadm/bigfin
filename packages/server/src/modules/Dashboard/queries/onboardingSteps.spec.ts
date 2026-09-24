// © 2026 Bigfin
import {
  buildOnboardingStatus,
  normalizeSkipped,
  ONBOARDING_STEP_KEYS,
  OnboardingSignals,
} from './onboardingSteps';

/**
 * Онбординг в шапке (FT-095 ТЗ-3): правило «шаг сделан» и счётчик.
 */
const EMPTY: OnboardingSignals = {
  userMoneyAccounts: 0,
  statementRows: 0,
  customizedArticles: 0,
  bankRules: 0,
  connectedBanks: 0,
  // Сам владелец есть в организации всегда.
  teamMembers: 1,
  plannedOperations: 0,
  reportBuilt: false,
};

const ALL_DONE: OnboardingSignals = {
  userMoneyAccounts: 1,
  statementRows: 5,
  customizedArticles: 1,
  bankRules: 2,
  connectedBanks: 1,
  teamMembers: 2,
  plannedOperations: 3,
  reportBuilt: true,
};

const doneKeys = (signals: OnboardingSignals) =>
  buildOnboardingStatus(signals, [])
    .steps.filter((step) => step.done)
    .map((step) => step.key);

describe('онбординг: какие шаги сделаны', () => {
  it('восемь шагов в порядке ТЗ', () => {
    expect(ONBOARDING_STEP_KEYS).toEqual([
      'account',
      'statement',
      'articles',
      'rule',
      'bank',
      'team',
      'payment',
      'report',
    ]);
  });

  it('у новой организации не сделано ничего — «0 из 8»', () => {
    const status = buildOnboardingStatus(EMPTY, []);
    expect(doneKeys(EMPTY)).toEqual([]);
    expect(status.done).toBe(0);
    expect(status.total).toBe(8);
    expect(status.complete).toBe(false);
  });

  it('добавленный счёт отмечает первый шаг и увеличивает счётчик', () => {
    const status = buildOnboardingStatus({ ...EMPTY, userMoneyAccounts: 1 }, []);
    expect(status.steps[0]).toEqual({ key: 'account', done: true, skipped: false });
    expect(status.done).toBe(1);
  });

  it('один человек в организации — это сам владелец, шаг «команда» не сделан', () => {
    expect(doneKeys({ ...EMPTY, teamMembers: 1 })).not.toContain('team');
    expect(doneKeys({ ...EMPTY, teamMembers: 2 })).toContain('team');
  });

  it('каждый сигнал отмечает ровно свой шаг', () => {
    const cases: Array<[Partial<OnboardingSignals>, string]> = [
      [{ statementRows: 1 }, 'statement'],
      [{ customizedArticles: 1 }, 'articles'],
      [{ bankRules: 1 }, 'rule'],
      [{ connectedBanks: 1 }, 'bank'],
      [{ plannedOperations: 1 }, 'payment'],
      [{ reportBuilt: true }, 'report'],
    ];
    cases.forEach(([patch, key]) => {
      expect(doneKeys({ ...EMPTY, ...patch })).toEqual([key]);
    });
  });

  it('всё сделано — счётчику больше нечего считать', () => {
    const status = buildOnboardingStatus(ALL_DONE, []);
    expect(status.done).toBe(8);
    expect(status.complete).toBe(true);
  });
});

describe('онбординг: пропуск и возврат', () => {
  it('пропущенный шаг выпадает из цели: «0 из 7»', () => {
    const status = buildOnboardingStatus(EMPTY, ['bank']);
    expect(status.steps.find((s) => s.key === 'bank')?.skipped).toBe(true);
    expect(status.total).toBe(7);
    expect(status.done).toBe(0);
  });

  it('возврат — это просто отсутствие ключа в списке: шаг снова в цели', () => {
    const skipped = buildOnboardingStatus(EMPTY, ['bank']);
    const returned = buildOnboardingStatus(EMPTY, []);
    expect(skipped.total).toBe(7);
    expect(returned.total).toBe(8);
    expect(returned.steps.find((s) => s.key === 'bank')?.skipped).toBe(false);
  });

  it('шаг, сделанный после пропуска, считается сделанным', () => {
    const status = buildOnboardingStatus({ ...EMPTY, bankRules: 1 }, ['rule']);
    expect(status.steps.find((s) => s.key === 'rule')).toEqual({
      key: 'rule',
      done: true,
      skipped: false,
    });
    expect(status.done).toBe(1);
    expect(status.total).toBe(8);
  });

  it('всё сделано или пропущено — готово', () => {
    const status = buildOnboardingStatus(
      { ...ALL_DONE, connectedBanks: 0, teamMembers: 1 },
      ['bank', 'team'],
    );
    expect(status.done).toBe(6);
    expect(status.total).toBe(6);
    expect(status.complete).toBe(true);
  });

  it('всё пропущено — тоже готово, «0 из 0»', () => {
    const status = buildOnboardingStatus(EMPTY, [...ONBOARDING_STEP_KEYS]);
    expect(status.total).toBe(0);
    expect(status.complete).toBe(true);
  });
});

describe('онбординг: настройка пропусков из хранилища', () => {
  it('не список — пусто', () => {
    expect(normalizeSkipped(undefined)).toEqual([]);
    expect(normalizeSkipped('bank')).toEqual([]);
    expect(normalizeSkipped({ bank: true })).toEqual([]);
  });

  it('незнакомые ключи и повторы отбрасываются', () => {
    expect(normalizeSkipped(['bank', 'nope', 3, 'bank', 'team'])).toEqual([
      'bank',
      'team',
    ]);
  });
});
