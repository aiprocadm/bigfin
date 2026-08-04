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

    const now = new Date();
    const rows = dto.lines.map((l) => ({
      budgetId,
      articleId: l.articleId,
      period: l.period,
      scenario: l.scenario,
      plannedAmount: l.plannedAmount,
      createdAt: now,
      updatedAt: now,
    }));

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      if (rows.length === 0) return [];

      // Пишем через knex, а не через модель: вставку СПИСКА строк Objection
      // умеет только в PostgreSQL и SQL Server («batch insert only works
      // with Postgresql and SQL Server»), а у нас MySQL — сохранение сетки
      // бюджета падало с 500. Knex же собирает мультивставку с
      // `ON DUPLICATE KEY UPDATE` по уникальному ключу ячейки.
      // Отметки времени проставляем сами: минуя модель, её хуки не сработают.
      await trx(BudgetLine.tableName)
        .insert(rows)
        .onConflict(['budgetId', 'articleId', 'period', 'scenario'])
        .merge(['plannedAmount', 'updatedAt']);

      return rows.length;
    });
  }
}
