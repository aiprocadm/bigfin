import { Response, NextFunction } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { defaultTo } from 'lodash';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ImportResourceApplication } from './ImportResourceApplication';
import { uploadImportFileMulterOptions } from './ImportMulter.utils';
import { parseJsonSafe } from '@/utils/parse-json';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { ImportSampleQueryDto } from '@/common/dtos/ImportSampleQuery.dto';

/**
 * Мастер импорта заводит записи любого вида — контрагентов, товары, счета,
 * — поэтому мерить его правом на что-то одно неверно: нужен полный доступ.
 */
@Controller('import')
@ApiTags('Import')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ImportController {
  constructor(private readonly importResourceApp: ImportResourceApplication) { }

  /**
   * Imports xlsx/csv to the given resource type.
   */
  @Post('/file')
  @RequirePermission('manage', 'all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload import file' })
  @ApiResponse({ status: 200, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file', uploadImportFileMulterOptions))
  async fileUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('resource') resource: string,
    @Body('params') rawParams?: string,
  ) {
    const params = defaultTo(parseJsonSafe(rawParams), {});

    return this.importResourceApp.import(resource, file.filename, params);
  }

  /**
   * Maps the columns of the imported file.
   */
  @Post('/:import_id/mapping')
  @RequirePermission('manage', 'all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Map import columns' })
  @ApiResponse({ status: 200, description: 'Mapping successful' })
  async mapping(
    @Param('import_id') importId: string,
    @Body('mapping')
    mapping: Array<{ group?: string; from: string; to: string }>,
  ) {
    return this.importResourceApp.mapping(importId, mapping);
  }

  /**
   * Preview the imported file before actual importing.
   */
  @Get('/:import_id/preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview import data' })
  @ApiResponse({ status: 200, description: 'Preview data' })
  async preview(@Param('import_id') importId: string) {
    return this.importResourceApp.preview(importId);
  }

  /**
   * Importing the imported file to the application storage.
   */
  @Post('/:import_id/import')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Process import' })
  @ApiResponse({ status: 200, description: 'Import processed successfully' })
  async import(@Param('import_id') importId: string) {
    return this.importResourceApp.process(importId);
  }

  /**
   * Retrieves the csv/xlsx sample sheet of the given resource name.
   */
  @Get('/sample')
  @ApiOperation({ summary: 'Get import sample' })
  @ApiResponse({ status: 200, description: 'Sample data' })
  async downloadImportSample(@Query() query: ImportSampleQueryDto) {
    return this.importResourceApp.sample(query.resource, query.format);
  }

  /**
   * Retrieves the import file meta.
   */
  @Get('/:import_id')
  @ApiOperation({ summary: 'Get import metadata' })
  @ApiResponse({ status: 200, description: 'Import metadata' })
  async getImportFileMeta(@Param('import_id') importId: string) {
    return this.importResourceApp.importMeta(importId);
  }
}
