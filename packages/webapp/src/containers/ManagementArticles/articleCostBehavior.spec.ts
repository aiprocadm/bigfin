// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { getArticleFormSchema } from './schemas';

/**
 * Этап 9 ТЗ: в мастере статьи обязательный выбор «постоянный / переменный».
 *
 * Правило условное: обязательно у расходов, бессмысленно у доходов. Ошибиться
 * тут легко в обе стороны — либо не спросить у расхода (и точка
 * безубыточности молча посчитается ближе, чем она есть), либо спросить у
 * выручки (и человек будет гадать, что выбрать).
 */
const base = {
  name: 'Аренда',
  parentId: null,
  accountIds: [],
  cashflowSection: '' as const,
};

const parse = (values: Record<string, unknown>) =>
  getArticleFormSchema().safeParse(values);

describe('пометка «постоянный / переменный» в форме статьи', () => {
  it('расходную статью без пометки сохранить нельзя', () => {
    const result = parse({ ...base, kind: 'expense', costBehavior: '' });

    expect(result.success).toBe(false);
  });

  it('ошибка показывается у самого поля, а не общей строкой', () => {
    // Общая ошибка внизу формы заставляет искать, что не так.
    const result = parse({ ...base, kind: 'expense', costBehavior: '' });

    if (result.success) throw new Error('форма не должна была пройти');
    expect(result.error.issues[0].path).toEqual(['costBehavior']);
  });

  it('расходная статья с пометкой проходит', () => {
    expect(
      parse({ ...base, kind: 'expense', costBehavior: 'fixed' }).success,
    ).toBe(true);
    expect(
      parse({ ...base, kind: 'expense', costBehavior: 'variable' }).success,
    ).toBe(true);
  });

  it('доходную статью пометка не блокирует', () => {
    // У выручки постоянных и переменных не бывает — спрашивать нечего.
    expect(
      parse({ ...base, kind: 'income', costBehavior: '' }).success,
    ).toBe(true);
  });

  it('поле вовсе отсутствует — расход всё равно не проходит', () => {
    // Обход через «не отправлять поле» закрыт: правило смотрит на значение,
    // а не на его присутствие.
    const result = parse({ ...base, kind: 'expense' });

    expect(result.success).toBe(false);
  });

  it('чужое значение в поле не принимается', () => {
    // Значение приходит из <select>, но форму можно заполнить и programmatically.
    expect(
      parse({ ...base, kind: 'expense', costBehavior: 'постоянный' }).success,
    ).toBe(false);
  });
});
