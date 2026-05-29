import { Injectable } from '@nestjs/common';
import { CreateManagementArticleService } from './commands/CreateManagementArticle.service';
import { EditManagementArticleService } from './commands/EditManagementArticle.service';
import { DeleteManagementArticleService } from './commands/DeleteManagementArticle.service';
import { GetManagementArticleService } from './queries/GetManagementArticle.service';
import { GetManagementArticlesService } from './queries/GetManagementArticles.service';
import {
  CreateManagementArticleDto,
  EditManagementArticleDto,
} from './dtos/ManagementArticle.dto';
import { GetManagementArticlesQueryDto } from './dtos/GetManagementArticlesQuery.dto';
import { ArticlesPlRollupService } from './queries/ArticlesPlRollup.service';
import { ArticlesRollupQueryDto } from './dtos/ArticlesRollupQuery.dto';

@Injectable()
export class ManagementArticlesApplication {
  constructor(
    private readonly createService: CreateManagementArticleService,
    private readonly editService: EditManagementArticleService,
    private readonly deleteService: DeleteManagementArticleService,
    private readonly getService: GetManagementArticleService,
    private readonly getListService: GetManagementArticlesService,
    private readonly rollupService: ArticlesPlRollupService,
  ) {}

  public createManagementArticle(dto: CreateManagementArticleDto) {
    return this.createService.create(dto);
  }

  public editManagementArticle(id: number, dto: EditManagementArticleDto) {
    return this.editService.edit(id, dto);
  }

  public deleteManagementArticle(id: number) {
    return this.deleteService.delete(id);
  }

  public getManagementArticle(id: number) {
    return this.getService.getManagementArticle(id);
  }

  public getManagementArticles(filterDto: GetManagementArticlesQueryDto) {
    return this.getListService.getManagementArticles(filterDto);
  }

  public getArticlesPlRollup(query: ArticlesRollupQueryDto) {
    return this.rollupService.getRollup(query);
  }
}
