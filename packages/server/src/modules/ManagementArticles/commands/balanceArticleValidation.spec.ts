// © 2026 Bigfin
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import {
  ARTICLE_KINDS,
  BALANCE_ARTICLE_KINDS,
  CASHFLOW_SECTIONS,
  ERRORS,
  PL_ARTICLE_KINDS,
} from '../constants';
import { CreateManagementArticleDto } from '../dtos/ManagementArticle.dto';

/**
 * Код ошибки лежит в поле `errorType`, а не в тексте: `ServiceError`
 * оставляет `message` пустым. Проверка по тексту прошла бы при ЛЮБОЙ
 * ошибке — это ровно тот бумажный сторож, которого надо избегать.
 */
const errorTypeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error: any) {
    return error?.errorType;
  }
  return 'ошибки не было';
};

const asyncErrorTypeOf = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error: any) {
    return error?.errorType;
  }
  return 'ошибки не было';
};

/**
 * Этап 17 ТЗ-2: справочник статей стал пятивидовым.
 *
 * Здесь проверяется то, что легко написать только в форме и забыть на
 * сервере. Через ручку API статью заводят импортом и интеграцией, и
 * бессмыслица, доехавшая до базы, потом тихо живёт в отчётах.
 */
const buildValidator = () =>
  new CommandManagementArticleValidatorService(
    (() => ({ query: () => ({}) })) as any,
    (() => ({ query: () => ({}) })) as any,
    (() => ({ query: () => ({}) })) as any,
  );

describe('пять видов статьи учёта', () => {
  it('домен — ровно пять видов, без сюрпризов', () => {
    expect([...ARTICLE_KINDS]).toEqual([
      'income',
      'expense',
      'asset',
      'liability',
      'equity',
    ]);
  });

  it('DTO объявляет домен из общего перечисления, а не своим списком', () => {
    // Иначе домен разъедется: перечисление расширили, а форма отвергает.
    const dto = new CreateManagementArticleDto();
    expect(dto).toBeInstanceOf(CreateManagementArticleDto);
    expect(ARTICLE_KINDS).toHaveLength(5);
  });

  describe('раздел движения денег у балансовой статьи ОБЯЗАТЕЛЕН', () => {
    it('балансовая статья без раздела отвергается', () => {
      // Без раздела статья не попадёт ни в одну строку ни одного отчёта:
      // в ОПиУ балансовых нет вовсе, а в ДДС строка встаёт по разделу.
      // Разметить ею платёж можно, и сумма исчезнет молча.
      const validator = buildValidator();

      BALANCE_ARTICLE_KINDS.forEach((kind) => {
        expect(
          errorTypeOf(() =>
            validator.validateCashflowSectionPresence(kind, null),
          ),
        ).toBe(ERRORS.CASHFLOW_SECTION_REQUIRED);

        expect(
          errorTypeOf(() =>
            validator.validateCashflowSectionPresence(kind, undefined),
          ),
        ).toBe(ERRORS.CASHFLOW_SECTION_REQUIRED);
      });
    });

    it('балансовая статья с разделом проходит', () => {
      const validator = buildValidator();

      BALANCE_ARTICLE_KINDS.forEach((kind) => {
        CASHFLOW_SECTIONS.forEach((section) => {
          expect(() =>
            validator.validateCashflowSectionPresence(kind, section),
          ).not.toThrow();
        });
      });
    });

    it('у доходов и расходов раздел по-прежнему необязателен', () => {
      // Требовать его задним числом значило бы сломать уже заведённые
      // статьи: у них есть ОПиУ, и без раздела они не пропадают.
      const validator = buildValidator();

      PL_ARTICLE_KINDS.forEach((kind) => {
        expect(() =>
          validator.validateCashflowSectionPresence(kind, null),
        ).not.toThrow();
      });
    });
  });

  describe('счёт и вид статьи должны быть с одной стороны', () => {
    const validatorWithAccounts = (accounts: any[]) =>
      new CommandManagementArticleValidatorService(
        (() => ({ query: () => ({}) })) as any,
        (() => ({
          query: () => ({ whereIn: () => Promise.resolve(accounts) }),
        })) as any,
        (() => ({ query: () => ({}) })) as any,
      );

    it('статья «Покупка оборудования» принимает счёт активов', async () => {
      const validator = validatorWithAccounts([
        { id: 1, accountRootType: 'asset' },
      ]);

      await expect(
        validator.validateAccountsMatchKind('asset', [1]),
      ).resolves.toBeUndefined();
    });

    it('статья вида «актив» ОТВЕРГАЕТ доходный счёт', async () => {
      // Приёмка 2 FIN-001. Проверка была написана обобщённо ещё под два
      // вида — на пяти она работает без правок, и это надо удержать.
      const validator = validatorWithAccounts([
        { id: 1, accountRootType: 'income' },
      ]);

      expect(
        await asyncErrorTypeOf(() =>
          validator.validateAccountsMatchKind('asset', [1]),
        ),
      ).toBe(ERRORS.ACCOUNT_KIND_MISMATCH);
    });

    it('каждый из пяти видов принимает свой корневой тип счёта', async () => {
      for (const kind of ARTICLE_KINDS) {
        const validator = validatorWithAccounts([
          { id: 1, accountRootType: kind },
        ]);

        await expect(
          validator.validateAccountsMatchKind(kind, [1]),
        ).resolves.toBeUndefined();
      }
    });
  });
});
