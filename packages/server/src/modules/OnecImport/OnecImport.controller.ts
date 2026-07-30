// © 2026 Bigfin
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ImportCommerceMlService,
  OnecImportReport,
  OnecPreviewReport,
} from './commands/ImportCommerceMl.service';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

const xmlUpload = () =>
  FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      file.originalname?.toLowerCase().endsWith('.xml')
        ? cb(null, true)
        : cb(new BadRequestException('Поддерживаются только файлы .xml'), false),
  });

@Controller('onec-import')
@ApiTags('onec-import')
export class OnecImportController {
  constructor(
    private readonly importService: ImportCommerceMlService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Post('preview')
  @RequirePermission('manage', 'all')
  @UseInterceptors(xmlUpload())
  @ApiOperation({ summary: 'Предпросмотр импорта CommerceML: что создастся и обновится.' })
  async preview(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<OnecPreviewReport> {
    await this.assertEnabled();
    if (!file) throw new BadRequestException('Файл выгрузки не передан');

    return this.importService.preview(file.buffer);
  }

  @Post()
  @RequirePermission('manage', 'all')
  @UseInterceptors(xmlUpload())
  @ApiOperation({ summary: 'Импортировать справочники CommerceML из 1С.' })
  async import(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<OnecImportReport> {
    await this.assertEnabled();
    if (!file) throw new BadRequestException('Файл выгрузки не передан');

    return this.importService.import(file.buffer);
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(Features.ONEC_IMPORT);
    if (!enabled) throw new ForbiddenException('Импорт из 1С выключен');
  }
}
