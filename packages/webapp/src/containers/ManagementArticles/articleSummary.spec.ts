import { describe, it, expect, vi, afterEach } from 'vitest';
import intl from 'react-intl-universal';
import { buildArticleSummary } from './articleSummary';

/** Переводы подставляем как есть — проверяем состав подписи, не словарь. */
const withTranslations = (dict: Record<string, string>) =>
  vi.spyOn(intl, 'get').mockImplementation(((key: string) => dict[key] ?? '') as any);

afterEach(() => vi.restoreAllMocks());

describe('подпись статьи учёта', () => {
  it('показывает вид, раздел ДДС и тип затрат', () => {
    withTranslations({
      'management_articles.kind.expense': 'Расход',
      'management_articles.cashflow_section.operating': 'Операционная',
      'management_articles.cost_behavior.fixed': 'Постоянная',
      'management_articles.accounts_count': 'счетов',
    });

    const summary = buildArticleSummary({
      kind: 'expense',
      cashflowSection: 'operating',
      costBehavior: 'fixed',
      accountsCount: 2,
    });

    expect(summary.parts).toEqual(['Расход', 'Операционная', 'Постоянная']);
    expect(summary.accountsLabel).toBe('счетов: 2');
    expect(summary.needsAccounts).toBe(false);
  });

  it('предупреждает, когда счета не привязаны', () => {
    withTranslations({
      'management_articles.kind.expense': 'Расход',
      'management_articles.no_accounts': 'счета не привязаны',
    });

    const summary = buildArticleSummary({ kind: 'expense', accountsCount: 0 });

    // Без счетов «Факт» в план-факте и финмодели нулевой — это надо видеть.
    expect(summary.needsAccounts).toBe(true);
    expect(summary.accountsLabel).toBe('счета не привязаны');
  });

  it('отсутствующий счётчик считается нулём', () => {
    withTranslations({ 'management_articles.no_accounts': 'счета не привязаны' });

    expect(buildArticleSummary({ kind: 'income' }).needsAccounts).toBe(true);
  });

  it('строковый счётчик из ответа считается числом', () => {
    withTranslations({ 'management_articles.accounts_count': 'счетов' });

    const summary = buildArticleSummary({ accountsCount: '3' as any });

    expect(summary.needsAccounts).toBe(false);
    expect(summary.accountsLabel).toBe('счетов: 3');
  });

  it('незаполненные раздел и тип затрат в подпись не попадают', () => {
    withTranslations({ 'management_articles.kind.income': 'Доход' });

    const summary = buildArticleSummary({
      kind: 'income',
      cashflowSection: null,
      costBehavior: null,
      accountsCount: 1,
    });

    expect(summary.parts).toEqual(['Доход']);
  });

  it('без перевода показывает исходное значение, а не пустоту', () => {
    withTranslations({});

    const summary = buildArticleSummary({ kind: 'expense', accountsCount: 1 });

    expect(summary.parts).toEqual(['expense']);
  });
});
