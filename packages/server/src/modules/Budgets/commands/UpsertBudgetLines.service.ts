import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { BudgetLine } from '../models/BudgetLine.model';
import { CommandBudgetValidatorService } from './CommandBudgetValidator.service';
import { UpsertBudgetLinesDto } from '../dtos/UpsertBudgetLines.dto';

@Injectable()
export class UpsertBudgetLinesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandBudgetValidatorService,
    @Inject(BudgetLine.name)
    private readonly lineModel: TenantModelProxy<typeof BudgetLine>,
  ) {}

  /**
   * Upserts budget cells by the unique key (budgetId, articleId, period, scenario).
   * Column identifiers are camelCase here; knexSnakeCaseMappers converts them to
   * snake_case in the generated SQL.
   * @param {number} budgetId
   * @param {UpsertBudgetLinesDto} dto
   */
  public async upsert(budgetId: number, dto: UpsertBudgetLinesDto) {
    await this.validator.validateBudgetExists(budgetId);

    const rows = dto.lines.map((l) => ({
      budgetId,
      articleId: l.articleId,
      period: l.period,
      scenario: l.scenario,
      plannedAmount: l.plannedAmount,
    }));

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      if (rows.length === 0) return [];
      return this.lineModel()
        .query(trx)
        .insert(rows)
        .onConflict(['budgetId', 'articleId', 'period', 'scenario'])
        .merge(['plannedAmount', 'updatedAt']);
    });
  }
}
