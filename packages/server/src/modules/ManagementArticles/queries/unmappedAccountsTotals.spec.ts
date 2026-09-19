// © 2026 Bigfin
import { unmappedAccountsTotals } from './ArticlesPlRollup.service';

/**
 * Р4 этапа 9: деньги, прошедшие мимо статей.
 *
 * Свёртка молча пропускает счёт без статьи. Это не «Не размечено» — ту
 * статью хотя бы видно. Здесь сумма просто не попадает в отчёт, итог
 * оказывается меньше, чем в ОПиУ, и ничто на это не указывает.
 */
const normals = (entries: Array<[number, string]>) =>
  new Map<number, string>(entries);

describe('деньги мимо статей', () => {
  it('счёт без статьи попадает в пробел, а не исчезает', () => {
    const result = unmappedAccountsTotals(
      [{ accountId: 1, articleId: 10 }],
      [
        { accountId: 1, net: 1000 },
        { accountId: 2, net: 300 },
      ],
      normals([
        [1, 'debit'],
        [2, 'debit'],
      ]),
    );

    expect(result.expense).toBe(300);
    expect(result.accountsCount).toBe(1);
  });

  it('привязанный счёт в пробел НЕ попадает', () => {
    const result = unmappedAccountsTotals(
      [{ accountId: 1, articleId: 10 }],
      [{ accountId: 1, net: 1000 }],
      normals([[1, 'debit']]),
    );

    expect(result).toEqual({ income: 0, expense: 0, accountsCount: 0 });
  });

  it('доходы и расходы разведены', () => {
    // «Не разнесено 300 000» без знака непонятно: это недосчитанная выручка
    // или недосчитанные траты. Ответ на эти два случая разный.
    const result = unmappedAccountsTotals(
      [],
      [
        { accountId: 1, net: 500 },
        { accountId: 2, net: 700 },
      ],
      normals([
        [1, 'credit'],
        [2, 'debit'],
      ]),
    );

    expect(result.income).toBe(500);
    expect(result.expense).toBe(700);
    expect(result.accountsCount).toBe(2);
  });

  it('счёт без движения за период пробелом не считается', () => {
    // Иначе человеку показали бы «разметьте 40 счетов», из которых 39 за
    // период вообще не двигались, — и он перестал бы читать это сообщение.
    const result = unmappedAccountsTotals(
      [],
      [
        { accountId: 1, net: 0 },
        { accountId: 2, net: 250 },
      ],
      normals([
        [1, 'debit'],
        [2, 'debit'],
      ]),
    );

    expect(result.accountsCount).toBe(1);
    expect(result.expense).toBe(250);
  });

  it('неизвестный вид счёта считается расходным', () => {
    // Вид счёта мог не прочитаться. Отнести неизвестное к расходам
    // безопаснее: завышенная выручка обманывает сильнее завышенных трат.
    const result = unmappedAccountsTotals(
      [],
      [{ accountId: 9, net: 100 }],
      normals([]),
    );

    expect(result.expense).toBe(100);
    expect(result.income).toBe(0);
  });

  it('пусто, когда мимо статей ничего не прошло', () => {
    expect(unmappedAccountsTotals([], [], normals([]))).toEqual({
      income: 0,
      expense: 0,
      accountsCount: 0,
    });
  });
});
