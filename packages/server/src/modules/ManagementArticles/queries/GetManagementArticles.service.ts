import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { GetManagementArticlesQueryDto } from '../dtos/GetManagementArticlesQuery.dto';
import { GetManagementArticlesResponse } from '../ManagementArticle.interfaces';
import { buildArticleTree } from '../utils/buildArticleTree';
import { resolvePlType } from '../utils/plTypes';

@Injectable()
export class GetManagementArticlesService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Retrieves management articles as a flat list or nested tree.
   * @param {GetManagementArticlesQueryDto} filterDto
   * @returns {Promise<GetManagementArticlesResponse>}
   */
  public async getManagementArticles(
    filterDto: GetManagementArticlesQueryDto,
  ): Promise<GetManagementArticlesResponse> {
    const asTree = filterDto.tree === 'true';

    const articles = await this.articleModel()
      .query()
      .onBuild((query) => {
        // In tree mode we must NOT filter by kind in the query: dropping a
        // parent whose child matches would orphan that child into a fake root.
        // Instead we fetch the whole forest and prune by root kind below.
        if (filterDto.kind && !asTree) {
          query.where('kind', filterDto.kind);
        }
        query.orderBy('sortOrder', 'asc');
      });

    const rows = this.withEffectivePlType(
      await this.withAccountsCount(articles),
    );

    if (!asTree) {
      return { data: rows };
    }

    let tree = buildArticleTree(rows) as unknown as ManagementArticle[];
    if (filterDto.kind) {
      tree = tree.filter((root) => (root as any).kind === filterDto.kind);
    }

    return { data: tree };
  }

  /**
   * Действующий ярус управленческого ОПиУ каждой статьи (FT-009 ТЗ-3).
   *
   * Наследование считается по тому же списку: у дочерней статьи тот же
   * вид, что у родителя, поэтому отбор по виду родителя не теряет.
   */
  private withEffectivePlType(rows: any[]): any[] {
    return rows.map((row: any) => {
      const resolved = resolvePlType(row.id, rows);
      return {
        ...row,
        effectivePlType: resolved.plType,
        plTypeInherited: resolved.inherited,
      };
    });
  }

  /**
   * Проставляет число привязанных счетов.
   *
   * Отдельным запросом, а не join'ом к основному: список статей маленький,
   * зато поведение предсказуемое. Без этого числа в списке не видно, настроена
   * статья или нет, — а пока счета не привязаны, «Факт» в план-факте бюджета
   * и в финмодели остаётся нулевым и выглядит как поломка.
   */
  private async withAccountsCount(articles: any[]): Promise<any[]> {
    if (!articles.length) return articles;

    const ids = articles.map((a: any) => a.id);
    // Считаем прямо по связующей таблице: запрос «от счетов» ссылаться на
    // колонку статей не может — MySQL отвечает Unknown column.
    const rows: any[] = await this.articleModel()
      .knex()('management_article_accounts')
      .select('articleId')
      .count({ total: 'accountId' })
      .whereIn('articleId', ids)
      .groupBy('articleId');

    const byArticle = new Map<number, number>(
      rows.map((r: any) => [Number(r.articleId), Number(r.total) || 0]),
    );
    // Отдаём простые объекты: у модели Objection чужое поле не переживает
    // сериализацию ответа и до экрана не доезжает.
    return articles.map((article: any) => ({
      ...(typeof article?.toJSON === 'function' ? article.toJSON() : article),
      accountsCount: byArticle.get(Number(article.id)) ?? 0,
    }));
  }
}
