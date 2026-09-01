// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/** Словари читаем с диска: импорт json в сборке сервера не включён. */
const dictionary = (lang: string, name: string): Record<string, string> =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../i18n', lang, `${name}.json`),
      'utf8',
    ),
  );

/**
 * Часть счётов создаётся не при сборке организации, а «лениво» — в момент,
 * когда они впервые понадобились: скидка покупателю, комиссия Stripe,
 * дебиторка в новой валюте. План счетов при сборке давно переведён, а эти
 * рождались с английскими именами — русская организация получала «Stripe
 * Clearing» посреди русского плана счетов (Р4 карты v18).
 */
const CONSTANTS = path.resolve(__dirname, 'Accounts.constants.ts');
const REPOSITORY = path.resolve(__dirname, 'repositories/Account.repository.ts');

/** Имена предопределённых счетов вне списков-видов. */
const predefinedNames = (source: string): string[] =>
  [...source.matchAll(/^\s*name:\s*'([^']+)',/gm)].map((m) => m[1]);

const isTranslationKey = (name: string) =>
  /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(name);

describe('лениво создаваемые счета рождаются на языке организации', () => {
  const constants = activeCode(fs.readFileSync(CONSTANTS, 'utf8'));
  const repository = activeCode(fs.readFileSync(REPOSITORY, 'utf8'));
  const ruAccountSeed = dictionary('ru', 'account_seed');
  const enAccountSeed = dictionary('en', 'account_seed');
  const ruAccount = dictionary('ru', 'account');
  const enAccount = dictionary('en', 'account');

  it('имена предопределённых счетов вообще нашлись', () => {
    expect(predefinedNames(constants).length).toBeGreaterThan(10);
  });

  it('имена предопределённых счетов — ключи перевода', () => {
    const raw = predefinedNames(constants).filter(
      (name) => !isTranslationKey(name),
    );

    expect(raw).toEqual([]);
  });

  it('ключи имён есть в обоих словарях', () => {
    const keys = predefinedNames(constants)
      .filter((name) => name.startsWith('account_seed.'))
      .map((name) => name.slice('account_seed.'.length));

    const missingRu = keys.filter((key) => !(key in ruAccountSeed));
    const missingEn = keys.filter((key) => !(key in enAccountSeed));

    expect({ missingRu, missingEn }).toEqual({ missingRu: [], missingEn: [] });
  });

  it('дебиторка и кредиторка в новой валюте зовутся по существующим ключам', () => {
    // Ключей не существовало вовсе: в имя счёта попадал сам ключ
    // `account.accounts_receivable.currency`.
    // Ключ проверяем как ЦЕЛОЕ имя: у `toHaveProperty` точка означает
    // вложенность, и «accounts_receivable.currency» искался бы как поле
    // `currency` внутри `accounts_receivable`.
    for (const key of ['accounts_receivable.currency', 'accounts_payable.currency']) {
      expect(Object.keys(ruAccount)).toContain(key);
      expect(Object.keys(enAccount)).toContain(key);
    }
  });

  it('перевод идёт на языке организации, а не на языке запроса', () => {
    // `i18n.t(key)` без языка берёт язык HTTP-запроса: тот же счёт назывался
    // бы по-разному в зависимости от того, кто первым его создал.
    const translations = [...repository.matchAll(/this\.i18n\.t\(([\s\S]{0,220}?)\)\s*,?\n/g)];

    expect(translations.length).toBeGreaterThan(0);
    const withoutLang = translations.filter((m) => !m[1].includes('lang'));
    expect(withoutLang.map((m) => m[1].slice(0, 60))).toEqual([]);
  });
});
