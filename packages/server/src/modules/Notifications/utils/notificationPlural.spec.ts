// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { buildNotificationArgs, pluralWord } from './notificationArgs';

/**
 * У4 карты v27. Числительные склоняются.
 *
 * В текстах уведомлений стояли заглушки «{count} счёт(ов)» и «{count}
 * account(s)» — по-русски должно быть «1 счёт / 3 счёта / 5 счетов».
 * Слово подбирает единая точка подстановок (notificationArgs), шаблоны
 * получают его готовым аргументом.
 */
const RU = { locale: 'ru', currencyCode: 'RUB' };
const EN = { locale: 'en', currencyCode: 'USD' };

describe('pluralWord', () => {
  const forms = { one: 'счёт', few: 'счёта', many: 'счетов' };

  it.each([
    [1, 'счёт'],
    [2, 'счёта'],
    [4, 'счёта'],
    [5, 'счетов'],
    [11, 'счетов'],
    [14, 'счетов'],
    [21, 'счёт'],
    [22, 'счёта'],
    [111, 'счетов'],
  ])('по-русски: %i → %s', (count, expected) => {
    expect(pluralWord(count as number, RU, forms)).toBe(expected);
  });

  it('по-английски: 1 account / 2 accounts', () => {
    const en = { one: 'account', many: 'accounts' };
    expect(pluralWord(1, EN, en)).toBe('account');
    expect(pluralWord(2, EN, en)).toBe('accounts');
  });
});

describe('склоняемые слова в аргументах шаблонов', () => {
  it('низкий остаток: слово «счёт» согласовано с числом', () => {
    const args = buildNotificationArgs(
      'low_balance',
      { minAmount: 1000000, accounts: [{ name: 'Касса', amount: 0 }, { name: 'Счёт', amount: 1 }] },
      RU,
    );
    expect(args.count).toBe(2);
    expect(args.accountsWord).toBe('счёта');
  });

  it('просрочка: английское слово «invoice» согласовано с числом', () => {
    expect(
      buildNotificationArgs('overdue', { count: 1, total: 1 }, EN).invoicesWord,
    ).toBe('invoice');
    expect(
      buildNotificationArgs('overdue', { count: 3, total: 1 }, EN).invoicesWord,
    ).toBe('invoices');
  });
});

describe('словари уведомлений без заглушек-скобок', () => {
  const dict = (lang: string) =>
    fs.readFileSync(
      path.resolve(__dirname, `../../../i18n/${lang}/notifications.json`),
      'utf8',
    );

  it('русский словарь не говорит «счёт(ов)»', () => {
    expect(dict('ru')).not.toContain('(ов)');
  });

  it('английский словарь не говорит «account(s)»', () => {
    expect(dict('en')).not.toContain('(s)');
  });
});
