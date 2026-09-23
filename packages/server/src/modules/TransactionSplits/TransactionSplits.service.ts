// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
import { ServiceError } from '@/modules/Items/ServiceError';

import { SplitLine, validateSplits } from './utils/splitRules';

export const SPLIT_ERRORS = {
  SPLIT_NOT_BALANCED: 'SPLIT_NOT_BALANCED',
};

export interface SaveSplitsInput {
  referenceType: string;
  referenceId: number;
  parentAmount: number;
  lines: SplitLine[];
}

/**
 * Разделение операции на части (этап 10 ТЗ).
 *
 * Родительская операция не трогается: в отчёты идут части, в выписку и сверку
 * с банком — родитель. Если бы части подменяли родителя, сверка с банком
 * перестала бы сходиться — а это первое, что проверяют.
 */
@Injectable()
export class TransactionSplitsService {
  constructor(
    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,
  ) {}

  /** Части операции. */
  public async getSplits(referenceType: string, referenceId: number, trx?: Knex.Transaction) {
    const knex = trx ?? this.tenantKnex();

    return knex('transaction_splits')
      .where('reference_type', referenceType)
      .where('reference_id', referenceId)
      .orderBy('id', 'asc');
  }

  /**
   * Сохраняет разбиение целиком: старые части заменяются новыми.
   *
   * Замена целиком, а не правка по строкам: частичное сохранение может
   * оставить разбиение не сходящимся с родительской суммой, и отчёт разойдётся
   * с банком, пока кто-нибудь это не заметит.
   */
  public async saveSplits(input: SaveSplitsInput, outerTrx?: Knex.Transaction) {
    const validation = validateSplits(input.parentAmount, input.lines);

    if (!validation.isValid) {
      throw new ServiceError(SPLIT_ERRORS.SPLIT_NOT_BALANCED, undefined, {
        problem: validation.problem,
        remaining: validation.remaining,
      });
    }

    const knex = this.tenantKnex();

    // В чужой транзакции (создание операции с частями, FT-023 ТЗ-3) пишем
    // внутри неё: проводки, собранные в ней же, должны видеть новые части.
    const run = <T>(work: (trx: Knex.Transaction) => Promise<T>) =>
      outerTrx ? work(outerTrx) : knex.transaction(work);

    return run(async (trx) => {
      await trx('transaction_splits')
        .where('reference_type', input.referenceType)
        .where('reference_id', input.referenceId)
        .delete();

      if (input.lines.length === 0) return { saved: 0 };

      await trx('transaction_splits').insert(
        input.lines.map((line) => ({
          reference_type: input.referenceType,
          reference_id: input.referenceId,
          amount: line.amount,
          article_id: line.articleId ?? null,
          project_id: line.projectId ?? null,
          legal_entity_id: line.legalEntityId ?? null,
        })),
      );

      return { saved: input.lines.length };
    });
  }

  /** Убирает разбиение: операция снова идёт в отчёты целиком. */
  public async clearSplits(referenceType: string, referenceId: number, trx?: Knex.Transaction) {
    const knex = trx ?? this.tenantKnex();

    const removed = await knex('transaction_splits')
      .where('reference_type', referenceType)
      .where('reference_id', referenceId)
      .delete();

    return { removed };
  }
}
