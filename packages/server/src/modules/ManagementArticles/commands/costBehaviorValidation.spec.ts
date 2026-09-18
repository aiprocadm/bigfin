// © 2026 Bigfin
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { ERRORS, COST_BEHAVIORS } from '../constants';

/**
 * Этап 9 ТЗ: в мастере статьи обязательный выбор «постоянный / переменный».
 *
 * Правило условное — обязательно для расходов и бессмысленно для доходов.
 * Такие правила легко написать только в форме и забыть на сервере: тогда
 * через ручку API (импорт, интеграция) в базу заедет бессмыслица, а экран
 * анализа расходов покажет её как факт.
 */
const buildValidator = () =>
  new CommandManagementArticleValidatorService(
    (() => ({ query: () => ({}) })) as any,
    (() => ({ query: () => ({}) })) as any,
    (() => ({ query: () => ({}) })) as any,
  );

describe('пометка «постоянный / переменный»', () => {
  it('у расходной статьи пометка допустима', () => {
    const validator = buildValidator();

    COST_BEHAVIORS.forEach((behavior) => {
      expect(() =>
        validator.validateCostBehaviorMatchesKind('expense', behavior),
      ).not.toThrow();
    });
  });

  it('у доходной статьи пометка отвергается', () => {
    // У выручки постоянных и переменных не бывает. Пропустить такую статью
    // значит подмешать её в расчёт постоянных затрат.
    const validator = buildValidator();

    expect(() =>
      validator.validateCostBehaviorMatchesKind('income', 'fixed'),
    ).toThrow();
  });

  it('ошибка называет причину, а не «неверные данные»', () => {
    const validator = buildValidator();

    try {
      validator.validateCostBehaviorMatchesKind('income', 'variable');
      throw new Error('проверка не сработала');
    } catch (error: any) {
      expect(error.errorType ?? error.message).toBe(
        ERRORS.COST_BEHAVIOR_ONLY_FOR_EXPENSE,
      );
    }
  });

  it('доходная статья без пометки проходит', () => {
    // Обычный случай: выручку размечать нечем и не нужно.
    const validator = buildValidator();

    expect(() =>
      validator.validateCostBehaviorMatchesKind('income', null),
    ).not.toThrow();
    expect(() =>
      validator.validateCostBehaviorMatchesKind('income', undefined),
    ).not.toThrow();
  });

  it('расходная статья без пометки на сервере не отвергается', () => {
    // Обязательность живёт в форме: на сервере уже лежат старые статьи без
    // пометки, и запретить их сохранение значило бы заблокировать правку
    // названия у половины справочника.
    const validator = buildValidator();

    expect(() =>
      validator.validateCostBehaviorMatchesKind('expense', null),
    ).not.toThrow();
  });
});
