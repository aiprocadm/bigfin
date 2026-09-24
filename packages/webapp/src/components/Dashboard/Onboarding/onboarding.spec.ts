import { describe, it, expect } from 'vitest';

import {
  applySkipped,
  isFinancialReportQuery,
  nextSkippedList,
  ONBOARDING_STEPS,
  summarizeOnboarding,
  toStepViews,
} from './onboarding';

/**
 * Онбординг в шапке (FT-095 ТЗ-3): счётчик, пропуск и возврат шага.
 */
const response = (
  overrides: Record<string, { done?: boolean; skipped?: boolean }> = {},
) => ({
  steps: ONBOARDING_STEPS.map(({ key }) => ({
    key,
    done: false,
    skipped: false,
    ...overrides[key],
  })),
});

describe('онбординг: шаги из ответа сервера', () => {
  it('восемь шагов, у каждого есть куда идти и подпись', () => {
    const steps = toStepViews(response());
    expect(steps.map((s) => s.key)).toEqual([
      'account',
      'statement',
      'articles',
      'rule',
      'bank',
      'team',
      'payment',
      'report',
    ]);
    steps.forEach((step) => {
      expect(step.href.startsWith('/')).toBe(true);
      expect(step.labelKey).toMatch(/^onboarding\.step\./);
    });
  });

  it('шаг, которого нет в ответе, — несделанный, а не пропавший', () => {
    const steps = toStepViews({ steps: [{ key: 'account', done: true }] });
    expect(steps).toHaveLength(8);
    expect(steps.find((s) => s.key === 'bank')).toMatchObject({
      done: false,
      skipped: false,
    });
  });

  it('незнакомый ответ — все шаги несделанные', () => {
    expect(toStepViews(null).every((s) => !s.done && !s.skipped)).toBe(true);
    expect(toStepViews({ steps: 'x' })).toHaveLength(8);
  });

  it('сделанный шаг не бывает пропущенным', () => {
    const steps = toStepViews(response({ rule: { done: true, skipped: true } }));
    expect(steps.find((s) => s.key === 'rule')).toMatchObject({
      done: true,
      skipped: false,
    });
  });
});

describe('онбординг: счётчик «N из M»', () => {
  it('новичок — «0 из 8», счётчик виден', () => {
    const summary = summarizeOnboarding(toStepViews(response()));
    expect(summary).toMatchObject({ done: 0, total: 8, mode: 'progress' });
  });

  it('добавил счёт — «1 из 8»', () => {
    const summary = summarizeOnboarding(
      toStepViews(response({ account: { done: true } })),
    );
    expect(summary.done).toBe(1);
    expect(summary.total).toBe(8);
  });

  it('пропущенный шаг выпадает из цели — «1 из 7»', () => {
    const summary = summarizeOnboarding(
      toStepViews(
        response({ account: { done: true }, bank: { skipped: true } }),
      ),
    );
    expect(summary.done).toBe(1);
    expect(summary.total).toBe(7);
  });

  it('всё сделано без пропусков — счётчик прячется', () => {
    const all = Object.fromEntries(
      ONBOARDING_STEPS.map(({ key }) => [key, { done: true }]),
    );
    const summary = summarizeOnboarding(toStepViews(response(all)));
    expect(summary).toMatchObject({ complete: true, mode: 'hidden' });
  });

  it('всё сделано или пропущено — тихое «Готово», чтобы пропуск можно было вернуть', () => {
    const all = Object.fromEntries(
      ONBOARDING_STEPS.map(({ key }) => [key, { done: true }]),
    );
    const summary = summarizeOnboarding(
      toStepViews(response({ ...all, team: { skipped: true } })),
    );
    expect(summary).toMatchObject({
      done: 7,
      total: 7,
      complete: true,
      mode: 'ready',
    });
  });
});

describe('онбординг: пропуск и возврат', () => {
  const steps = toStepViews(
    response({ account: { done: true }, team: { skipped: true } }),
  );

  it('пропуск добавляет шаг к уже пропущенным', () => {
    expect(nextSkippedList(steps, 'bank', true)).toEqual(['team', 'bank']);
  });

  it('возврат убирает шаг из пропущенных', () => {
    expect(nextSkippedList(steps, 'team', false)).toEqual([]);
  });

  it('сделанный шаг пропустить нельзя', () => {
    expect(nextSkippedList(steps, 'account', true)).toEqual(['team']);
  });

  it('повторный пропуск не дублирует шаг', () => {
    expect(nextSkippedList(steps, 'team', true)).toEqual(['team']);
  });

  it('меню отзывается сразу: пропуск и возврат меняют счётчик', () => {
    const skipped = applySkipped(steps, nextSkippedList(steps, 'bank', true));
    expect(summarizeOnboarding(skipped).total).toBe(6);

    const returned = applySkipped(
      skipped,
      nextSkippedList(skipped, 'bank', false),
    );
    expect(returned.find((s) => s.key === 'bank')?.skipped).toBe(false);
    expect(summarizeOnboarding(returned).total).toBe(7);
  });
});

describe('онбординг: отметка «собрал отчёт»', () => {
  it('узнаёт запрос отчёта по общему префиксу', () => {
    expect(isFinancialReportQuery(['FINANCIAL-REPORT', 'BALANCE-SHEET', {}])).toBe(
      true,
    );
  });

  it('прочие запросы — не отчёт', () => {
    expect(isFinancialReportQuery(['ACCOUNTS'])).toBe(false);
    expect(isFinancialReportQuery('FINANCIAL-REPORT')).toBe(false);
    expect(isFinancialReportQuery(undefined)).toBe(false);
  });
});
