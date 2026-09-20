import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ManagementArticlesApplication } from './ManagementArticles.application';
import {
  CreateManagementArticleDto,
  EditManagementArticleDto,
} from './dtos/ManagementArticle.dto';
import { GetManagementArticlesQueryDto } from './dtos/GetManagementArticlesQuery.dto';
import { GetArticleReportMapQueryDto } from './dtos/GetArticleReportMapQuery.dto';
import { GetArticleReportMapService } from './queries/GetArticleReportMap.service';
import { ManagementArticleResponseDto } from './dtos/ManagementArticleResponse.dto';
import { ArticlesRollupQueryDto } from './dtos/ArticlesRollupQuery.dto';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { AccountAction } from '@/interfaces/Account';

/**
 * Статьи учёта — это разрезы, по которым собираются отчёты всей организации:
 * добавили статью — изменился состав ОПиУ и ДДС у всех. Поэтому право взято
 * то же, что у счетов учёта, а не «повседневное» право справочника.
 */
@Controller('management-articles')
@ApiTags('Management Articles')
@ApiExtraModels(ManagementArticleResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ManagementArticlesController {
  constructor(
    private readonly application: ManagementArticlesApplication,
    private readonly reportMap: GetArticleReportMapService,
  ) {}

  @Post()
  @RequirePermission(AccountAction.CREATE, AbilitySubject.Account)
  @ApiOperation({ summary: 'Create a new management article.' })
  createManagementArticle(@Body() dto: CreateManagementArticleDto) {
    return this.application.createManagementArticle(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves management articles (flat or tree).' })
  @ApiResponse({
    status: 200,
    description: 'The management articles have been retrieved.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(ManagementArticleResponseDto) },
    },
  })
  getManagementArticles(@Query() filterDto: GetManagementArticlesQueryDto) {
    return this.application.getManagementArticles(filterDto);
  }

  @Get('report-map')
  @ApiOperation({
    summary: 'Куда попадает статья: схема трёх отчётов с подсветкой.',
  })
  getReportMap(@Query() query: GetArticleReportMapQueryDto) {
    return this.reportMap.getReportMap(query);
  }

  @Get('pl-rollup')
  @ApiOperation({ summary: 'Management P&L rolled up by articles.' })
  getArticlesPlRollup(@Query() query: ArticlesRollupQueryDto) {
    return this.application.getArticlesPlRollup(query);
  }

  @Put(':id')
  @RequirePermission(AccountAction.EDIT, AbilitySubject.Account)
  @ApiOperation({ summary: 'Edit the given management article.' })
  editManagementArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditManagementArticleDto,
  ) {
    return this.application.editManagementArticle(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieves a management article details.' })
  @ApiResponse({
    status: 200,
    description: 'The management article details have been retrieved.',
    schema: { $ref: getSchemaPath(ManagementArticleResponseDto) },
  })
  getManagementArticle(@Param('id', ParseIntPipe) id: number) {
    return this.application.getManagementArticle(id);
  }

  @Delete(':id')
  @RequirePermission(AccountAction.DELETE, AbilitySubject.Account)
  @ApiOperation({ summary: 'Delete the given management article.' })
  deleteManagementArticle(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteManagementArticle(id);
  }
}
