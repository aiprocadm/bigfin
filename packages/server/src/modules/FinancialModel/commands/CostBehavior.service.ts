// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';

export interface ExpenseArticleRow {
  id: number;
  name: string;
  parentId: number | null;
  costBehavior: string | null;
}

/**
 * Пометка расходных статей «постоянная/переменная» для точки безубыточности.
 * Список — только расходные статьи (income не участвуют в постоянных затратах);
 * пометка пишется в management_articles.cost_behavior (аддитивная колонка).
 * null = снять пометку (статья не учитывается как постоянная).
 */
@Injectable()
export class CostBehaviorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  async listExpenseArticles(): Promise<ExpenseArticleRow[]> {
    const rows = await this.articleModel()
      .query()
      .where('kind', 'expense')
      .orderBy('sortOrder');
    return rows.map((a: any) => ({
      id: a.id,
      name: a.name,
      parentId: a.parentId ?? null,
      costBehavior: a.costBehavior ?? null,
    }));
  }

  async setCostBehavior(
    id: number,
    behavior: 'fixed' | 'variable' | null,
  ): Promise<ExpenseArticleRow> {
    const updated: any = await this.articleModel()
      .query()
      .patchAndFetchById(id, { costBehavior: behavior } as any);
    if (!updated) throw new NotFoundException('Статья не найдена');
    return {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId ?? null,
      costBehavior: updated.costBehavior ?? null,
    };
  }
}
