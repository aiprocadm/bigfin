// © 2026 Bigfin
import { accountsToRename } from './translateSeededAccounts';

/**
 * Д3 карты v30 (решение 39, принято 27.08). Русские названия счетов —
 * организациям, созданным до перевода плана счетов.
 *
 * Новые организации получают русский план счетов: сид переводит названия
 * по языку организации. Организации постарше живут с английскими «Bank
 * Account», «Petty Cash», «Tax Payable» — в русском продукте для
 * предпринимателя без бухгалтерского образования это стена.
 *
 * Правило безопасности: переименовываем ТОЛЬКО нетронутые счета — те, чьё
 * название до сих пор в точности совпадает с английским эталоном сида.
 * Стоит человеку переименовать счёт по-своему — его выбор не трогаем
 * никогда.
 */
const ENGLISH = {
  'bank-account': 'Bank Account',
  'petty-cash': 'Petty Cash',
  'tax-payable': 'Tax Payable',
};

const RUSSIAN = {
  'bank-account': 'Расчётный счёт',
  'petty-cash': 'Касса',
  'tax-payable': 'Налоги к уплате',
};

describe('какие счета переименовывать', () => {
  it('нетронутый английский счёт переименовывается', () => {
    const план = accountsToRename(
      [{ id: 1, slug: 'bank-account', name: 'Bank Account' }],
      ENGLISH,
      RUSSIAN,
    );

    expect(план).toEqual([
      { id: 1, from: 'Bank Account', to: 'Расчётный счёт' },
    ]);
  });

  it('счёт, переименованный человеком, не трогаем', () => {
    const план = accountsToRename(
      [{ id: 1, slug: 'bank-account', name: 'Счёт в Сбере' }],
      ENGLISH,
      RUSSIAN,
    );

    expect(план).toEqual([]);
  });

  it('уже переведённый счёт не трогаем — команду можно гонять дважды', () => {
    const план = accountsToRename(
      [{ id: 1, slug: 'bank-account', name: 'Расчётный счёт' }],
      ENGLISH,
      RUSSIAN,
    );

    expect(план).toEqual([]);
  });

  it('счёт без слага пропускаем: эталона для него нет', () => {
    const план = accountsToRename(
      [{ id: 1, slug: null, name: 'Bank Account' }],
      ENGLISH,
      RUSSIAN,
    );

    expect(план).toEqual([]);
  });

  it('незнакомый слаг пропускаем, а не роняем прогон', () => {
    const план = accountsToRename(
      [{ id: 1, slug: 'выдуманный-счёт', name: 'Something' }],
      ENGLISH,
      RUSSIAN,
    );

    expect(план).toEqual([]);
  });

  it('английской организации переименовывать нечего', () => {
    const план = accountsToRename(
      [{ id: 1, slug: 'bank-account', name: 'Bank Account' }],
      ENGLISH,
      ENGLISH,
    );

    expect(план).toEqual([]);
  });

  it('пробелы по краям не считаются правкой человека', () => {
    const план = accountsToRename(
      [{ id: 1, slug: 'petty-cash', name: '  Petty Cash ' }],
      ENGLISH,
      RUSSIAN,
    );

    expect(план).toEqual([{ id: 1, from: '  Petty Cash ', to: 'Касса' }]);
  });

  it('переименовывает все нетронутые сразу, пропуская тронутые', () => {
    const план = accountsToRename(
      [
        { id: 1, slug: 'bank-account', name: 'Bank Account' },
        { id: 2, slug: 'petty-cash', name: 'Моя касса' },
        { id: 3, slug: 'tax-payable', name: 'Tax Payable' },
      ],
      ENGLISH,
      RUSSIAN,
    );

    expect(план.map((p) => p.id)).toEqual([1, 3]);
  });
});
