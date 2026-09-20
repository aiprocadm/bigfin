import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '../Tenancy/TenancyDB/TenancyDB.module';
import { ManagementArticlesController } from './ManagementArticles.controller';
import { ManagementArticlesApplication } from './ManagementArticles.application';
import { CommandManagementArticleValidatorService } from './commands/CommandManagementArticleValidator.service';
import { CreateManagementArticleService } from './commands/CreateManagementArticle.service';
import { EditManagementArticleService } from './commands/EditManagementArticle.service';
import { DeleteManagementArticleService } from './commands/DeleteManagementArticle.service';
import { GetManagementArticleService } from './queries/GetManagementArticle.service';
import { GetManagementArticlesService } from './queries/GetManagementArticles.service';
import { ArticlesPlRollupService } from './queries/ArticlesPlRollup.service';
import { ArticlesCashflowRollupService } from './queries/ArticlesCashflowRollup.service';

@Module({
  imports: [TenancyDatabaseModule],
  controllers: [ManagementArticlesController],
  providers: [
    ManagementArticlesApplication,
    CommandManagementArticleValidatorService,
    CreateManagementArticleService,
    EditManagementArticleService,
    DeleteManagementArticleService,
    GetManagementArticleService,
    GetManagementArticlesService,
    ArticlesPlRollupService,
    ArticlesCashflowRollupService,
  ],
  // Свёртка по статьям — и по начислению, и по деньгам — принадлежит статьям.
  // Бюджеты берут расчёт отсюда, а не держат его у себя (этап 16 ТЗ-2).
  exports: [ArticlesPlRollupService, ArticlesCashflowRollupService],
})
export class ManagementArticlesModule {}
