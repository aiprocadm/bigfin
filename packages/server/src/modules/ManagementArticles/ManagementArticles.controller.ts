import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
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
import { ManagementArticleResponseDto } from './dtos/ManagementArticleResponse.dto';

@Controller('management-articles')
@ApiTags('Management Articles')
@ApiExtraModels(ManagementArticleResponseDto)
@ApiCommonHeaders()
export class ManagementArticlesController {
  constructor(
    private readonly application: ManagementArticlesApplication,
  ) {}

  @Post()
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

  @Put(':id')
  @ApiOperation({ summary: 'Edit the given management article.' })
  editManagementArticle(
    @Param('id') id: number,
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
  getManagementArticle(@Param('id') id: number) {
    return this.application.getManagementArticle(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the given management article.' })
  deleteManagementArticle(@Param('id') id: number) {
    return this.application.deleteManagementArticle(id);
  }
}
