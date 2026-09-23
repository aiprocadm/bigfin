// © 2026 Bigfin
import { HttpStatus } from '@nestjs/common';

import { ServiceError } from '@/modules/Items/ServiceError';
import { CommandManagementArticleValidatorService } from '../commands/CommandManagementArticleValidator.service';
import { ARTICLE_KINDS, ERRORS } from '../constants';
import {
  EXPENSE_PL_TYPES,
  INCOME_PL_TYPES,
  PL_TYPE_EXCLUDED,
  PL_TYPES,
  plTypeError,
} from './plTypes';

/**
 * Ярус управленческого ОПиУ: домен и совместимость с видом (FT-009 ТЗ-3).
 */
describe('домен ярусов', () => {
  it('девять ярусов плюс явное «не участвует»', () => {
    expect(PL_TYPES).toHaveLength(10);
    expect(PL_TYPES).toContain(PL_TYPE_EXCLUDED);
  });

  it('ярусы доходов и расходов не пересекаются', () => {
    const shared = INCOME_PL_TYPES.filter((type) =>
      (EXPENSE_PL_TYPES as readonly string[]).includes(type),
    );
    expect(shared).toEqual([]);
  });
});

describe('ярус и вид статьи', () => {
  it('доходной статье — только ярусы доходов', () => {
    INCOME_PL_TYPES.forEach((type) => {
      expect(plTypeError('income', type)).toBeNull();
    });
    expect(plTypeError('income', 'administrative')).toBe(
      ERRORS.ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND,
    );
  });

  it('расходной статье — только ярусы расходов', () => {
    EXPENSE_PL_TYPES.forEach((type) => {
      expect(plTypeError('expense', type)).toBeNull();
    });
    // Выручка у расходной статьи перевернула бы знак в отчёте.
    expect(plTypeError('expense', 'revenue')).toBe(
      ERRORS.ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND,
    );
  });

  it('балансовым статьям ярус не положен вовсе', () => {
    ['asset', 'liability', 'equity'].forEach((kind) => {
      expect(plTypeError(kind, 'revenue')).toBe(
        ERRORS.ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND,
      );
      expect(plTypeError(kind, PL_TYPE_EXCLUDED)).toBe(
        ERRORS.ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND,
      );
    });
  });

  it('«не участвует» доступно и доходам, и расходам', () => {
    expect(plTypeError('income', PL_TYPE_EXCLUDED)).toBeNull();
    expect(plTypeError('expense', PL_TYPE_EXCLUDED)).toBeNull();
  });

  it('пустой ярус допустим у любого вида', () => {
    ARTICLE_KINDS.forEach((kind) => {
      expect(plTypeError(kind, null)).toBeNull();
      expect(plTypeError(kind, undefined)).toBeNull();
    });
  });

  it('неизвестный ярус назван своей ошибкой, а не «не тот вид»', () => {
    expect(plTypeError('expense', 'marketing_costs')).toBe(
      ERRORS.ARTICLE_PL_TYPE_UNKNOWN,
    );
  });
});

describe('проверка при сохранении статьи', () => {
  const validator = new CommandManagementArticleValidatorService(
    (() => ({})) as any,
    (() => ({})) as any,
    (() => ({})) as any,
  );

  const thrown = (fn: () => void): ServiceError => {
    try {
      fn();
    } catch (error) {
      return error as ServiceError;
    }
    throw new Error('ошибки не было');
  };

  it('ярус у балансовой статьи — 422 с кодом «не для этого вида»', () => {
    // Критерий приёмки 2 FT-009.
    const error = thrown(() =>
      validator.validatePlTypeMatchesKind('asset', 'revenue'),
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.errorType).toBe(ERRORS.ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND);
    expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('неизвестный ярус — 422 с кодом «неизвестный ярус»', () => {
    const error = thrown(() =>
      validator.validatePlTypeMatchesKind('expense', 'nonsense'),
    );

    expect(error.errorType).toBe(ERRORS.ARTICLE_PL_TYPE_UNKNOWN);
    expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('допустимый ярус проходит молча', () => {
    expect(() =>
      validator.validatePlTypeMatchesKind('expense', 'direct_variable'),
    ).not.toThrow();
  });
});
